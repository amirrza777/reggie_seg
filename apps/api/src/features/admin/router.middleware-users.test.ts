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
    enterprise: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), delete: vi.fn(), create: vi.fn() },
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
  (prisma.enterprise.count as any).mockResolvedValue(0);
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

describe("admin router middleware and user management", () => {
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
});
