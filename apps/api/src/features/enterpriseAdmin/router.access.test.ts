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
    featureFlag: { findMany: vi.fn(), update: vi.fn() },
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

function getRouteHandler(method: "get" | "post" | "put" | "patch" | "delete", path: string) {
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
    joinCode: "M0000007",
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
  (prisma.featureFlag.findMany as any).mockResolvedValue([]);
  (prisma.featureFlag.update as any).mockResolvedValue({ key: "peer_feedback", label: "Peer feedback", enabled: true });

  (prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(prisma);
  });
});

describe("enterpriseAdmin router access control", () => {
  const getAccess = getRouteHandler("get", "/modules/:moduleId/access");
  const getAccessSelection = getRouteHandler("get", "/modules/:moduleId/access-selection");
  const getJoinCode = getRouteHandler("get", "/modules/:moduleId/join-code");
  const updateModule = getRouteHandler("put", "/modules/:moduleId");
  const deleteModule = getRouteHandler("delete", "/modules/:moduleId");
  const patchFeatureFlag = getRouteHandler("patch", "/feature-flags/:key");

  it("returns module access payload", async () => {
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

    const res = mockRes();
    await getAccess({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        module: expect.objectContaining({ id: 2, leaderCount: 1, teachingAssistantCount: 1, studentCount: 1 }),
      }),
    );
  });

  it("returns module access selection ids", async () => {
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

    const res = mockRes();
    await getAccessSelection({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        module: expect.objectContaining({ id: 2 }),
        leaderIds: [11],
        taIds: [12],
        studentIds: [31],
      }),
    );
  });

  it("allows module leads to read join codes", async () => {
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2, joinCode: "ABCDEFGH" });
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce({ moduleId: 2 });

    const res = mockRes();
    await getJoinCode({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith({ moduleId: 2, joinCode: "ABCDEFGH" });
  });

  it("rejects teaching assistants reading join codes", async () => {
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2, joinCode: "ABCDEFGH" });
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce(null);

    const res = mockRes();
    await getJoinCode({ enterpriseUser: { id: 12, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(403);
  });

  it("allows module update for module lead", async () => {
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

    const res = mockRes();
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
      select: { id: true },
    });
    expect((res.status as any)).not.toHaveBeenCalledWith(403);
  });

  it("deletes module for users who can manage module access", async () => {
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce({ moduleId: 2 });
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 2 });

    const res = mockRes();
    await deleteModule({ enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect(prisma.moduleLead.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 2 } });
    expect(prisma.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 2 } });
    expect(prisma.userModule.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1", moduleId: 2 } });
    expect(prisma.module.delete).toHaveBeenCalledWith({ where: { id: 2 }, select: { id: true } });
    expect((res.json as any)).toHaveBeenCalledWith({ moduleId: 2, deleted: true });
  });

  it("forbids module deletion for non-leaders", async () => {
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce(null);

    const res = mockRes();
    await deleteModule({ enterpriseUser: { id: 13, enterpriseId: "ent-1", role: "STAFF" }, params: { moduleId: "2" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(403);
    expect(prisma.module.delete).not.toHaveBeenCalled();
  });

  it("allows enterprise admin module updates as an override without module-lead membership", async () => {
    (prisma.module.findFirst as any).mockResolvedValue(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 11, role: "STAFF" }]);

    const res = mockRes();
    await updateModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "2" },
        body: { name: "Databases", leaderIds: [11], taIds: [], studentIds: [] },
      } as any,
      res,
    );

    expect((res.status as any)).not.toHaveBeenCalledWith(403);
    expect(prisma.moduleLead.findFirst).not.toHaveBeenCalled();
    expect(prisma.module.findFirst).toHaveBeenCalled();
  });

  it("forbids feature flag updates for staff users", async () => {
    const res = mockRes();
    await patchFeatureFlag(
      {
        enterpriseUser: { id: 11, enterpriseId: "ent-1", role: "STAFF" },
        params: { key: "peer_feedback" },
        body: { enabled: true },
      } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(403);
    expect(prisma.featureFlag.update).not.toHaveBeenCalled();
  });
});
