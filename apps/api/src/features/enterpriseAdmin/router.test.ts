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
    module: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    moduleLead: { findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    moduleTeachingAssistant: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    userModule: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
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

function getRouteHandler(method: "get" | "post" | "put" | "delete", path: string) {
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
  (prisma.module.findUnique as any).mockResolvedValue({
    id: 7,
    name: "Module 7",
    briefText: null,
    timelineText: null,
    expectationsText: null,
    readinessNotesText: null,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
  });
  (prisma.module.create as any).mockResolvedValue({ id: 7 });
  (prisma.module.delete as any).mockResolvedValue({ id: 7 });

  (prisma.user.findMany as any).mockResolvedValue([]);
  (prisma.userModule.deleteMany as any).mockResolvedValue({ count: 0 });
  (prisma.userModule.createMany as any).mockResolvedValue({ count: 0 });
  (prisma.moduleLead.deleteMany as any).mockResolvedValue({ count: 0 });
  (prisma.moduleLead.createMany as any).mockResolvedValue({ count: 0 });
  (prisma.moduleLead.findMany as any).mockResolvedValue([]);
  (prisma.moduleTeachingAssistant.deleteMany as any).mockResolvedValue({ count: 0 });
  (prisma.moduleTeachingAssistant.createMany as any).mockResolvedValue({ count: 0 });
  (prisma.moduleTeachingAssistant.findMany as any).mockResolvedValue([]);
  (prisma.userModule.findMany as any).mockResolvedValue([]);

  (prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(prisma);
  });
});

describe("enterpriseAdmin router", () => {
  it("resolve middleware rejects students and stores enterprise user for staff/admin", async () => {
    const [requireAuth, resolveEnterpriseUser] = getUseHandlers();
    const next = vi.fn() as NextFunction;

    const req: any = { headers: { "x-user-id": "99" } };
    const res = mockRes();

    requireAuth(req, res, next);
    await resolveEnterpriseUser(req, res, next);

    expect(req.enterpriseUser).toEqual({ id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 5,
      enterpriseId: "ent-1",
      role: "STUDENT",
      active: true,
    });

    const studentReq: any = { user: { sub: 5 } };
    const studentRes = mockRes();
    await resolveEnterpriseUser(studentReq, studentRes, next);
    expect((studentRes.status as any)).toHaveBeenCalledWith(403);
  });

  it("lists modules for admins and staff scopes", async () => {
    const listModules = getRouteHandler("get", "/modules");
    const searchModules = getRouteHandler("get", "/modules/search");

    (prisma.module.findMany as any).mockResolvedValueOnce([]);
    let res = mockRes();
    await listModules({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);
    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enterpriseId: "ent-1" },
      }),
    );

    (prisma.module.findMany as any).mockResolvedValueOnce([]);
    res = mockRes();
    await listModules({ enterpriseUser: { id: 44, enterpriseId: "ent-1", role: "STAFF" } } as any, res);
    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          enterpriseId: "ent-1",
          OR: [
            { moduleLeads: { some: { userId: 44 } } },
            { moduleTeachingAssistants: { some: { userId: 44 } } },
          ],
        },
      }),
    );

    res = mockRes();
    await searchModules({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { page: "0" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.module.count as any).mockResolvedValueOnce(2);
    (prisma.module.findMany as any).mockResolvedValueOnce([
      {
        id: 7,
        name: "Software Engineering",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        createdAt: new Date("2026-03-01"),
        updatedAt: new Date("2026-03-02"),
        _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
        moduleLeads: [{ userId: 99 }],
      },
    ]);
    res = mockRes();
    await searchModules(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { q: "software", pageSize: "1" } } as any,
      res,
    );
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
        items: [expect.objectContaining({ id: 7, canManageAccess: true })],
      }),
    );
  });

  it("creates module with role assignments, including student teaching assistants", async () => {
    const createModule = getRouteHandler("post", "/modules");

    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 99, role: "ENTERPRISE_ADMIN" },
      { id: 11, role: "STAFF" },
      { id: 12, role: "STUDENT" },
      { id: 31, role: "STUDENT" },
    ]);

    const res = mockRes();
    await createModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: {
          name: "Data",
          leaderIds: [11],
          taIds: [12],
          studentIds: [31],
        },
      } as any,
      res,
    );

    expect(prisma.module.create).toHaveBeenCalledWith({
      data: {
        enterpriseId: "ent-1",
        name: "Data",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
      },
      select: { id: true },
    });

    expect(prisma.moduleLead.createMany).toHaveBeenCalledWith({
      data: [
        { moduleId: 7, userId: 11 },
        { moduleId: 7, userId: 99 },
      ],
      skipDuplicates: true,
    });
    expect(prisma.moduleTeachingAssistant.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 7, userId: 12 }],
      skipDuplicates: true,
    });
    expect(prisma.userModule.createMany).toHaveBeenCalledWith({
      data: [{ enterpriseId: "ent-1", moduleId: 7, userId: 31 }],
      skipDuplicates: true,
    });
    expect((res.status as any)).toHaveBeenCalledWith(201);
  });

  it("searches assignable access users with scope and pagination", async () => {
    const searchAccessUsers = getRouteHandler("get", "/modules/access-users/search");

    let res = mockRes();
    await searchAccessUsers({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { scope: "owners" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.count as any).mockResolvedValueOnce(2);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 11, email: "lead@x.com", firstName: "Lead", lastName: "User", active: true },
    ]);
    res = mockRes();
    await searchAccessUsers(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { scope: "staff", q: "lead", pageSize: "1" } } as any,
      res,
    );
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
        scope: "staff",
        items: [expect.objectContaining({ id: 11 })],
      }),
    );
  });

  it("returns module access payload and allows leader to update module", async () => {
    const getAccess = getRouteHandler("get", "/modules/:moduleId/access");
    const getAccessSelection = getRouteHandler("get", "/modules/:moduleId/access-selection");
    const updateModule = getRouteHandler("put", "/modules/:moduleId");

    (prisma.module.findFirst as any).mockResolvedValueOnce({
      id: 2,
      name: "Databases",
      briefText: "Brief",
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-05"),
      _count: { userModules: 1, moduleLeads: 1, moduleTeachingAssistants: 1 },
    });
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce({ moduleId: 2 });
    (prisma.user.findMany as any)
      .mockResolvedValueOnce([
        {
          id: 11,
          email: "lead@x.com",
          firstName: "Lead",
          lastName: "User",
          active: true,
          moduleLeads: [{ moduleId: 2 }],
          moduleTeachingAssistants: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          email: "student@x.com",
          firstName: "Stu",
          lastName: "Dent",
          active: true,
          userModules: [{ moduleId: 2 }],
          moduleTeachingAssistants: [],
        },
      ]);

    let res = mockRes();
    await getAccess({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        module: expect.objectContaining({ id: 2, leaderCount: 1, teachingAssistantCount: 1, studentCount: 1 }),
      }),
    );

    (prisma.module.findFirst as any).mockResolvedValueOnce({
      id: 2,
      name: "Databases",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-05"),
      _count: { userModules: 1, moduleLeads: 1, moduleTeachingAssistants: 1 },
    });
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce({ moduleId: 2 });
    (prisma.moduleLead.findMany as any).mockResolvedValueOnce([{ userId: 11 }]);
    (prisma.moduleTeachingAssistant.findMany as any).mockResolvedValueOnce([{ userId: 12 }]);
    (prisma.userModule.findMany as any).mockResolvedValueOnce([{ userId: 31 }]);
    res = mockRes();
    await getAccessSelection({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        module: expect.objectContaining({ id: 2 }),
        leaderIds: [11],
        taIds: [12],
        studentIds: [31],
      }),
    );

    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce({ moduleId: 2 });
    (prisma.module.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({
        id: 2,
        name: "Databases",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        createdAt: new Date("2026-02-01"),
        updatedAt: new Date("2026-02-05"),
        _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
      });
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 11, role: "STAFF" }]);

    res = mockRes();
    await updateModule(
      {
        enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" },
        params: { moduleId: "2" },
        body: { name: "Databases", leaderIds: [11], taIds: [], studentIds: [] },
      } as any,
      res,
    );

    expect(prisma.module.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: {
        name: "Databases",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
      },
    });
    expect((res.status as any)).not.toHaveBeenCalledWith(403);
  });

  it("deletes module for users who can manage module access", async () => {
    const deleteModule = getRouteHandler("delete", "/modules/:moduleId");

    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce({ moduleId: 2 });
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2 });

    const res = mockRes();
    await deleteModule({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect(prisma.moduleLead.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 2 } });
    expect(prisma.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 2 } });
    expect(prisma.userModule.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1", moduleId: 2 } });
    expect(prisma.module.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect((res.json as any)).toHaveBeenCalledWith({ moduleId: 2, deleted: true });
  });

  it("forbids module deletion for non-leaders", async () => {
    const deleteModule = getRouteHandler("delete", "/modules/:moduleId");
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce(null);

    const res = mockRes();
    await deleteModule({ enterpriseUser: { id: 13, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(403);
    expect(prisma.module.delete).not.toHaveBeenCalled();
  });

  it("forbids module updates for enterprise admins who are not module leaders", async () => {
    const updateModule = getRouteHandler("put", "/modules/:moduleId");
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce(null);

    const res = mockRes();
    await updateModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "2" },
        body: { name: "Databases", leaderIds: [11], taIds: [], studentIds: [] },
      } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(403);
    expect(prisma.module.update).not.toHaveBeenCalled();
  });
});
