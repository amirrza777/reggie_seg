import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Response } from "express";
import router from "./router.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: (req: any, _res: any, next: NextFunction) => {
    const raw = req.headers?.["x-user-id"];
    if (raw) req.user = { sub: Number(raw) };
    next();
  },
}));

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    module: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    userModule: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

function getUseHandlers() {
  return (router as any).stack.filter((layer: any) => !layer.route).map((layer: any) => layer.handle);
}

function getRouteHandler(method: "get" | "post" | "put", path: string) {
  const layer = (router as any).stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  return layer.route.stack[0].handle;
}

beforeEach(() => {
  vi.clearAllMocks();

  (prisma.user.findUnique as any).mockResolvedValue({
    id: 99,
    enterpriseId: "ent-1",
    role: "ENTERPRISE_ADMIN",
    active: true,
  });

  (prisma.user.count as any).mockResolvedValue(5);
  (prisma.module.count as any).mockResolvedValue(2);
  (prisma.team.count as any).mockResolvedValue(1);
  (prisma.meeting.count as any).mockResolvedValue(4);

  (prisma.module.findMany as any).mockResolvedValue([]);
  (prisma.module.findFirst as any).mockResolvedValue(null);
  (prisma.module.create as any).mockResolvedValue({ id: 7, name: "Module 7", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") });

  (prisma.user.findMany as any).mockResolvedValue([]);
  (prisma.userModule.deleteMany as any).mockResolvedValue({ count: 3 });
  (prisma.userModule.createMany as any).mockResolvedValue({ count: 2 });

  (prisma.$transaction as any).mockImplementation(async (arg: any) => arg(prisma));
});

describe("enterpriseAdmin router", () => {
  it("auth middleware + resolve middleware handle unauthenticated and forbidden cases", async () => {
    const [requireAuth, resolveEnterpriseAdminUser] = getUseHandlers();
    const next = vi.fn() as NextFunction;

    let req: any = { headers: {} };
    let res = mockRes();
    requireAuth(req, res, next);
    expect(req.user).toBeUndefined();

    next.mockClear();
    await resolveEnterpriseAdminUser(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(401);

    req = { user: { sub: 99 } };
    res = mockRes();
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await resolveEnterpriseAdminUser(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(403);

    req = { user: { sub: 99 } };
    res = mockRes();
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 99, enterpriseId: "ent-1", role: "STAFF", active: true });
    await resolveEnterpriseAdminUser(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(403);

    req = { user: { sub: 99 } };
    res = mockRes();
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN", active: false });
    await resolveEnterpriseAdminUser(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(403);

    req = { user: { sub: 99 } };
    res = mockRes();
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 99, enterpriseId: "ent-1", role: "ADMIN", active: true });
    await resolveEnterpriseAdminUser(req, res, next);
    expect(req.enterpriseAdminUser).toEqual({ id: 99, enterpriseId: "ent-1", role: "ADMIN" });
    expect(next).toHaveBeenCalled();
  });

  it("overview returns 500 when enterprise missing and returns metrics when present", async () => {
    const overview = getRouteHandler("get", "/overview");

    let res = mockRes();
    await overview({ enterpriseAdminUser: undefined } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    (prisma.user.count as any)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    (prisma.module.count as any).mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    (prisma.team.count as any).mockResolvedValueOnce(4);
    (prisma.meeting.count as any).mockResolvedValueOnce(9);

    res = mockRes();
    await overview({ enterpriseAdminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith({
      totals: {
        users: 10,
        activeUsers: 8,
        students: 6,
        staff: 2,
        enterpriseAdmins: 1,
        modules: 3,
        teams: 4,
        meetings: 9,
      },
      hygiene: {
        inactiveUsers: 2,
        studentsWithoutModule: 1,
        modulesWithoutStudents: 1,
      },
      trends: {
        newUsers30d: 3,
        newModules30d: 2,
      },
    });
  });

  it("modules list and creation handlers validate and map branches", async () => {
    const listModules = getRouteHandler("get", "/modules");
    const createModule = getRouteHandler("post", "/modules");

    let res = mockRes();
    await listModules({ enterpriseAdminUser: undefined } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    (prisma.module.findMany as any).mockResolvedValueOnce([
      { id: 1, name: "M1", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-02"), _count: { userModules: 4 } },
    ]);
    res = mockRes();
    await listModules({ enterpriseAdminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith([
      { id: 1, name: "M1", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-02"), studentCount: 4 },
    ]);

    res = mockRes();
    await createModule({ enterpriseAdminUser: undefined, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    res = mockRes();
    await createModule({ enterpriseAdminUser: { enterpriseId: "ent-1" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await createModule({ enterpriseAdminUser: { enterpriseId: "ent-1" }, body: { name: "x".repeat(121) } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 1 });
    res = mockRes();
    await createModule({ enterpriseAdminUser: { enterpriseId: "ent-1" }, body: { name: "Data" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(409);

    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    (prisma.module.create as any).mockResolvedValueOnce({ id: 3, name: "Data", createdAt: new Date("2026-03-03"), updatedAt: new Date("2026-03-03") });
    res = mockRes();
    await createModule({ enterpriseAdminUser: { enterpriseId: "ent-1" }, body: { name: " Data " } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(201);
    expect((res.json as any)).toHaveBeenCalledWith({
      id: 3,
      name: "Data",
      createdAt: new Date("2026-03-03"),
      updatedAt: new Date("2026-03-03"),
      studentCount: 0,
    });
  });

  it("module students handlers validate inputs and map enrollment", async () => {
    const getStudents = getRouteHandler("get", "/modules/:moduleId/students");
    const putStudents = getRouteHandler("put", "/modules/:moduleId/students");

    let res = mockRes();
    await getStudents({ enterpriseAdminUser: undefined, params: { moduleId: "1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    res = mockRes();
    await getStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "bad" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    res = mockRes();
    await getStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.module.findFirst as any).mockResolvedValueOnce({
      id: 2,
      name: "Databases",
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-05"),
      _count: { userModules: 1 },
    });
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 1, email: "a@x.com", firstName: "A", lastName: "One", active: true, userModules: [{ moduleId: 2 }] },
      { id: 2, email: "b@x.com", firstName: "B", lastName: "Two", active: false, userModules: [] },
    ]);
    res = mockRes();
    await getStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith({
      module: { id: 2, name: "Databases", createdAt: new Date("2026-02-01"), updatedAt: new Date("2026-02-05"), studentCount: 1 },
      students: [
        { id: 1, email: "a@x.com", firstName: "A", lastName: "One", active: true, enrolled: true },
        { id: 2, email: "b@x.com", firstName: "B", lastName: "Two", active: false, enrolled: false },
      ],
    });

    res = mockRes();
    await putStudents({ enterpriseAdminUser: undefined, params: { moduleId: "2" }, body: { studentIds: [1] } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "bad" }, body: { studentIds: [1] } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" }, body: { studentIds: "bad" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" }, body: { studentIds: [1, "bad"] } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" }, body: { studentIds: [1] } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2 });
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 1 }]);
    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" }, body: { studentIds: [1, 2] } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2 });
    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" }, body: { studentIds: [] } } as any, res);
    expect(prisma.userModule.createMany).not.toHaveBeenCalled();

    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2 });
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    res = mockRes();
    await putStudents({ enterpriseAdminUser: { enterpriseId: "ent-1" }, params: { moduleId: "2" }, body: { studentIds: [1, 1, 2] } } as any, res);
    expect(prisma.userModule.createMany).toHaveBeenCalledWith({
      data: [
        { enterpriseId: "ent-1", moduleId: 2, userId: 1 },
        { enterpriseId: "ent-1", moduleId: 2, userId: 2 },
      ],
    });
    expect((res.json as any)).toHaveBeenCalledWith({ moduleId: 2, studentIds: [1, 2], studentCount: 2 });
  });
});
