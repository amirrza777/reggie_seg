import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import router from "./router.js";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";
import { buildAdminUserSearchWhere, parseAdminUserSearchFilters } from "./userSearch.js";

const { generateFromNameMock } = vi.hoisted(() => ({ generateFromNameMock: vi.fn() }));

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    module: { count: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    featureFlag: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    enterprise: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), create: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../audit/service.js", () => ({ listAuditLogs: vi.fn() }));
vi.mock("./userSearch.js", () => ({ buildAdminUserSearchWhere: vi.fn(), parseAdminUserSearchFilters: vi.fn() }));
vi.mock("../services/enterprise/enterpriseCodeGeneratorService.js", () => ({
  EnterpriseCodeGeneratorService: vi.fn().mockImplementation(() => ({ generateFromName: generateFromNameMock })),
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

function getRouteHandler(method: "get" | "post" | "patch" | "delete", path: string) {
  const layer = (router as any).stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  return layer.route.stack[0].handle;
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.spyOn(jwt, "verify").mockReturnValue({ sub: 1, admin: true } as any);

  (prisma.user.findUnique as any).mockResolvedValue({
    id: 1,
    email: "admin@kcl.ac.uk",
    enterpriseId: "ent-1",
    role: "ADMIN",
  });

  (prisma.user.count as any).mockResolvedValue(10);
  (prisma.module.count as any).mockResolvedValue(3);
  (prisma.team.count as any).mockResolvedValue(2);
  (prisma.meeting.count as any).mockResolvedValue(1);

  (prisma.user.findMany as any).mockResolvedValue([]);
  (prisma.user.findFirst as any).mockResolvedValue(null);
  (prisma.user.update as any).mockResolvedValue({ id: 2, email: "u@x.com", role: "STAFF", active: true });
  (prisma.refreshToken.updateMany as any).mockResolvedValue({ count: 1 });

  (prisma.featureFlag.findMany as any).mockResolvedValue([]);
  (prisma.featureFlag.update as any).mockResolvedValue({ key: "peer_feedback", label: "Peer feedback", enabled: true });
  (prisma.featureFlag.deleteMany as any).mockResolvedValue({ count: 1 });
  (prisma.featureFlag.createMany as any).mockResolvedValue({ count: 3 });

  (prisma.enterprise.findMany as any).mockResolvedValue([]);
  (prisma.enterprise.findUnique as any).mockResolvedValue(null);
  (prisma.enterprise.delete as any).mockResolvedValue({ id: "ent-1" });
  (prisma.enterprise.create as any).mockResolvedValue({ id: "ent-2", code: "ENT2", name: "Enterprise 2", createdAt: new Date() });

  (prisma.auditLog.deleteMany as any).mockResolvedValue({ count: 0 });

  (parseAdminUserSearchFilters as any).mockReturnValue({
    ok: true,
    value: { query: null, role: null, active: null, page: 1, pageSize: 10 },
  });
  (buildAdminUserSearchWhere as any).mockReturnValue({ enterpriseId: "ent-1" });

  (prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(prisma);
  });

  (listAuditLogs as any).mockResolvedValue([]);
  generateFromNameMock.mockResolvedValue("AUTO123");
});

describe("admin router", () => {
  it("ensureAdmin middleware maps auth failures and success", async () => {
    const [ensureAdmin] = getUseHandlers();
    const next = vi.fn() as NextFunction;

    let req: any = { cookies: {} };
    let res = mockRes();
    await ensureAdmin(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(401);

    vi.spyOn(jwt, "verify").mockImplementationOnce(() => {
      throw new Error("bad token");
    });
    req = { cookies: { refresh_token: "rt" } };
    res = mockRes();
    await ensureAdmin(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(401);

    vi.spyOn(jwt, "verify").mockReturnValueOnce({ admin: true } as any);
    req = { cookies: { refresh_token: "rt" } };
    res = mockRes();
    await ensureAdmin(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(401);

    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: 1, admin: false } as any);
    req = { cookies: { refresh_token: "rt" } };
    res = mockRes();
    await ensureAdmin(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(403);

    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: 1, admin: true } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 1, email: "a@x.com", enterpriseId: "ent-1", role: "STAFF" });
    req = { cookies: { refresh_token: "rt" } };
    res = mockRes();
    await ensureAdmin(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(403);

    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: 1, admin: true } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1", role: "ADMIN" });
    req = { cookies: { refresh_token: "rt" } };
    res = mockRes();
    await ensureAdmin(req, res, next);
    expect(req.adminUser).toEqual({ id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1", role: "ADMIN" });
    expect(next).toHaveBeenCalled();
  });

  it("ensureSuperAdmin allows only admin@kcl.ac.uk", () => {
    const [, ensureSuperAdmin] = getUseHandlers();
    const next = vi.fn() as NextFunction;

    let req: any = { adminUser: { email: "manager@kcl.ac.uk" } };
    let res = mockRes();
    ensureSuperAdmin(req, res, next);
    expect((res.status as any)).toHaveBeenCalledWith(403);

    req = { adminUser: { email: "ADMIN@KCL.AC.UK" } };
    res = mockRes();
    ensureSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("summary and users routes return scoped data", async () => {
    const summary = getRouteHandler("get", "/summary");
    const users = getRouteHandler("get", "/users");

    let res = mockRes();
    await summary({ adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith({ users: 10, modules: 3, teams: 2, meetings: 1 });

    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 1, email: "s@x.com", firstName: "S", lastName: "A", role: "STUDENT", active: true },
      { id: 2, email: "t@x.com", firstName: "T", lastName: "B", role: "STAFF", active: true },
    ]);
    res = mockRes();
    await users({ adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1, isStaff: false, role: "STUDENT" }),
      expect.objectContaining({ id: 2, isStaff: true, role: "STAFF" }),
    ]);
  });

  it("user search routes handle invalid filters and paginated payload", async () => {
    const ownSearch = getRouteHandler("get", "/users/search");
    const enterpriseSearch = getRouteHandler("get", "/enterprises/:enterpriseId/users/search");

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({ ok: false, error: "bad filters" });
    let res = mockRes();
    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: "a", role: "STUDENT", active: true, page: 2, pageSize: 10 },
    });
    (prisma.user.count as any).mockResolvedValueOnce(15);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 1, email: "a@x.com", firstName: "A", lastName: "B", role: "STUDENT", active: true },
    ]);
    res = mockRes();
    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ total: 15, totalPages: 2, page: 2 }));

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({ ok: false, error: "bad filter" });
    res = mockRes();
    await enterpriseSearch({ params: { enterpriseId: "ent-2" }, query: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 5 },
    });
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    res = mockRes();
    await enterpriseSearch({ params: { enterpriseId: "ent-2" }, query: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 5 },
    });
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({ id: "ent-2" });
    (prisma.user.count as any).mockResolvedValueOnce(1);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STAFF", active: true },
    ]);
    res = mockRes();
    await enterpriseSearch({ params: { enterpriseId: "ent-2" }, query: {} } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ total: 1, totalPages: 1 }));
  });

  it("updates user role and user profile with all guard branches", async () => {
    const patchRole = getRouteHandler("patch", "/users/:id/role");
    const patchUser = getRouteHandler("patch", "/users/:id");

    let res = mockRes();
    await patchRole({ params: { id: "bad" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "OWNER" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "ENTERPRISE_ADMIN" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    res = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "admin@kcl.ac.uk" });
    res = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 2, email: "u@x.com", role: "STAFF", active: true });
    res = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 2, isStaff: true, role: "STAFF" }));

    res = mockRes();
    await patchUser({ params: { id: "bad" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    res = mockRes();
    await patchUser({ params: { id: "3" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 3, email: "admin@kcl.ac.uk" });
    res = mockRes();
    await patchUser({ params: { id: "3" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 3, email: "student@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 3, email: "student@x.com", role: "STAFF", active: false });
    res = mockRes();
    await patchUser({ params: { id: "3" }, body: { active: false, role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 3, revoked: false }, data: { revoked: true } });

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 4, email: "student@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 4, email: "student@x.com", role: "STUDENT", active: true });
    res = mockRes();
    await patchUser({ params: { id: "4" }, body: { active: true, role: "ENTERPRISE_ADMIN" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 4, isStaff: false }));
  });

  it("feature flag routes map label normalization and errors", async () => {
    const listFlags = getRouteHandler("get", "/feature-flags");
    const patchFlag = getRouteHandler("patch", "/feature-flags/:key");

    (prisma.featureFlag.findMany as any).mockResolvedValueOnce([
      { key: "repos", label: "Repos", enabled: true },
      { key: "modules", label: "Modules", enabled: false },
    ]);
    let res = mockRes();
    await listFlags({ adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith([
      { key: "repos", label: "Repositories", enabled: true },
      { key: "modules", label: "Modules", enabled: false },
    ]);

    res = mockRes();
    await patchFlag({ params: { key: "k" }, body: { enabled: "yes" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.featureFlag.update as any).mockResolvedValueOnce({ key: "repos", label: "Repos", enabled: false });
    res = mockRes();
    await patchFlag({ params: { key: "repos" }, body: { enabled: false }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith({ key: "repos", label: "Repositories", enabled: false });

    (prisma.featureFlag.update as any).mockRejectedValueOnce({ code: "P2025" });
    res = mockRes();
    await patchFlag({ params: { key: "missing" }, body: { enabled: true }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.featureFlag.update as any).mockRejectedValueOnce(new Error("db"));
    res = mockRes();
    await patchFlag({ params: { key: "missing" }, body: { enabled: true }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);
  });

  it("enterprise routes cover listing, creation, user management and deletion", async () => {
    const listEnterprises = getRouteHandler("get", "/enterprises");
    const createEnterprise = getRouteHandler("post", "/enterprises");
    const listEnterpriseUsers = getRouteHandler("get", "/enterprises/:enterpriseId/users");
    const patchEnterpriseUser = getRouteHandler("patch", "/enterprises/:enterpriseId/users/:id");
    const deleteEnterprise = getRouteHandler("delete", "/enterprises/:enterpriseId");

    (prisma.enterprise.findMany as any).mockResolvedValueOnce([
      {
        id: "ent-1",
        code: "ENT1",
        name: "Enterprise One",
        createdAt: new Date("2026-01-01"),
        users: [{ role: "ADMIN" }, { role: "ENTERPRISE_ADMIN" }, { role: "STAFF" }, { role: "STUDENT" }],
        _count: { users: 4, modules: 2, teams: 1 },
      },
    ]);
    let res = mockRes();
    await listEnterprises({} as any, res);
    expect((res.json as any)).toHaveBeenCalledWith([
      expect.objectContaining({ admins: 1, enterpriseAdmins: 1, staff: 1, students: 1 }),
    ]);

    res = mockRes();
    await createEnterprise({ body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await createEnterprise({ body: { name: "x".repeat(121) } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await createEnterprise({ body: { name: "Enterprise", code: "bad#" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({ id: "exists" });
    res = mockRes();
    await createEnterprise({ body: { name: "Enterprise", code: "ENT1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(409);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    (prisma.enterprise.create as any).mockResolvedValueOnce({
      id: "new-ent",
      code: "AUTO123",
      name: "Auto Enterprise",
      createdAt: new Date("2026-01-02"),
    });
    res = mockRes();
    await createEnterprise({ body: { name: "Auto Enterprise" } } as any, res);
    expect(generateFromNameMock).toHaveBeenCalledWith("Auto Enterprise");
    expect((res.status as any)).toHaveBeenCalledWith(201);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    (prisma.$transaction as any).mockRejectedValueOnce({ code: "P2002" });
    res = mockRes();
    await createEnterprise({ body: { name: "E", code: "EEE" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(409);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    (prisma.$transaction as any).mockRejectedValueOnce(new Error("db"));
    res = mockRes();
    await createEnterprise({ body: { name: "E", code: "EEE" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    res = mockRes();
    await listEnterpriseUsers({ params: { enterpriseId: "ent-missing" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({ id: "ent-2" });
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STUDENT", active: true },
    ]);
    res = mockRes();
    await listEnterpriseUsers({ params: { enterpriseId: "ent-2" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith([expect.objectContaining({ isStaff: false })]);

    res = mockRes();
    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "bad" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    res = mockRes();
    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "admin@kcl.ac.uk" });
    res = mockRes();
    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "ADMIN", active: false });
    res = mockRes();
    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: { active: false, role: "ADMIN" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ isStaff: true }));

    res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "ent-1" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "ent-missing" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(404);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({
      id: "ent-busy",
      _count: { users: 1, modules: 0, teams: 0, auditLogs: 0 },
    });
    res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "ent-busy" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({
      id: "ent-clean",
      _count: { users: 0, modules: 0, teams: 0, auditLogs: 2 },
    });
    res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "ent-clean" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-clean" } });

    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({
      id: "ent-clean2",
      _count: { users: 0, modules: 0, teams: 0, auditLogs: 0 },
    });
    res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "ent-clean2" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith({ success: true });
  });

  it("audit logs route validates enterprise context and query parsing", async () => {
    const auditLogs = getRouteHandler("get", "/audit-logs");

    let res = mockRes();
    await auditLogs({ adminUser: undefined, query: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(500);

    (listAuditLogs as any).mockResolvedValueOnce([
      {
        id: 1,
        action: "LOGIN",
        createdAt: new Date("2026-03-01"),
        ip: "1.1.1.1",
        userAgent: "ua",
        user: { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STAFF" },
      },
    ]);

    res = mockRes();
    await auditLogs({ adminUser: { enterpriseId: "ent-1" }, query: { from: "bad", to: "2026-03-02", limit: "5" } } as any, res);
    expect(listAuditLogs).toHaveBeenCalledWith({
      enterpriseId: "ent-1",
      from: undefined,
      to: new Date("2026-03-02"),
      limit: 5,
    });
    expect((res.json as any)).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 1,
        action: "LOGIN",
        user: expect.objectContaining({ id: 2, email: "u@x.com", role: "STAFF" }),
      }),
    ]);
  });

  it("covers remaining parse and pagination branches", async () => {
    const patchRole = getRouteHandler("patch", "/users/:id/role");
    const patchUser = getRouteHandler("patch", "/users/:id");
    const listEnterpriseUsers = getRouteHandler("get", "/enterprises/:enterpriseId/users");
    const enterpriseSearch = getRouteHandler("get", "/enterprises/:enterpriseId/users/search");
    const patchEnterpriseUser = getRouteHandler("patch", "/enterprises/:enterpriseId/users/:id");
    const ownSearch = getRouteHandler("get", "/users/search");
    const auditLogs = getRouteHandler("get", "/audit-logs");

    let res = mockRes();
    await patchRole({ params: { id: "2" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 5, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 5, email: "u@x.com", role: "STUDENT", active: true });
    res = mockRes();
    await patchUser({ params: { id: "5" }, body: { active: true }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));

    res = mockRes();
    await listEnterpriseUsers({ params: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 5 },
    });
    res = mockRes();
    await enterpriseSearch({ params: {}, query: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    res = mockRes();
    await patchEnterpriseUser({ params: { id: "2" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);

    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 2,
      email: "u@x.com",
      firstName: "U",
      lastName: "X",
      role: "STUDENT",
      active: true,
    });
    res = mockRes();
    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: { active: true } } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 10 },
    });
    (prisma.user.count as any).mockResolvedValueOnce(0);
    (prisma.user.findMany as any).mockResolvedValueOnce([]);
    res = mockRes();
    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ total: 0, totalPages: 0, hasNextPage: false }),
    );

    (listAuditLogs as any).mockResolvedValueOnce([]);
    res = mockRes();
    await auditLogs({ adminUser: { enterpriseId: "ent-1" }, query: { from: "2026-03-01", to: "bad-date" } } as any, res);
    expect(listAuditLogs).toHaveBeenLastCalledWith({
      enterpriseId: "ent-1",
      from: new Date("2026-03-01"),
      to: undefined,
      limit: undefined,
    });

    (listAuditLogs as any).mockResolvedValueOnce([]);
    res = mockRes();
    await auditLogs({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);
    expect(listAuditLogs).toHaveBeenLastCalledWith({
      enterpriseId: "ent-1",
      from: undefined,
      to: undefined,
      limit: undefined,
    });
  });
});
