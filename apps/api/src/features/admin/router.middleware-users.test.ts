import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction } from "express";
import jwt from "jsonwebtoken";
import router from "./router.js";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";
import { buildAdminUserSearchWhere, matchesAdminUserSearchCandidate, parseAdminUserSearchFilters } from "./userSearch.js";

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
vi.mock("./userSearch.js", () => ({
  buildAdminUserSearchWhere: vi.fn(),
  parseAdminUserSearchFilters: vi.fn(),
  matchesAdminUserSearchCandidate: vi.fn(),
}));
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
  (matchesAdminUserSearchCandidate as any).mockReturnValue(false);

  (prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(prisma);
  });

  (listAuditLogs as any).mockResolvedValue([]);
  generateFromNameMock.mockResolvedValue("AUTO123");
});

describe("admin router middleware and user management", () => {
  const [ensureAdmin, ensureSuperAdmin] = getUseHandlers();
  const summary = getRouteHandler("get", "/summary");
  const users = getRouteHandler("get", "/users");
  const ownSearch = getRouteHandler("get", "/users/search");
  const enterpriseSearch = getRouteHandler("get", "/enterprises/:enterpriseId/users/search");
  const patchRole = getRouteHandler("patch", "/users/:id/role");
  const patchUser = getRouteHandler("patch", "/users/:id");

  it("ensureAdmin returns 401 when refresh token is missing", async () => {
    const req: any = { cookies: {} };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect((res.status as any)).toHaveBeenCalledWith(401);
  });

  it("ensureAdmin returns 401 when jwt verification throws", async () => {
    vi.spyOn(jwt, "verify").mockImplementationOnce(() => {
      throw new Error("bad token");
    });
    const req: any = { cookies: { refresh_token: "rt" } };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect((res.status as any)).toHaveBeenCalledWith(401);
  });

  it("ensureAdmin returns 401 when jwt payload omits sub", async () => {
    vi.spyOn(jwt, "verify").mockReturnValueOnce({ admin: true } as any);
    const req: any = { cookies: { refresh_token: "rt" } };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect((res.status as any)).toHaveBeenCalledWith(401);
  });

  it("ensureAdmin returns 403 when jwt admin claim is false", async () => {
    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: 1, admin: false } as any);
    const req: any = { cookies: { refresh_token: "rt" } };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect((res.status as any)).toHaveBeenCalledWith(403);
  });

  it("ensureAdmin returns 403 when resolved user is not admin", async () => {
    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: 1, admin: true } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 1, email: "a@x.com", enterpriseId: "ent-1", role: "STAFF" });
    const req: any = { cookies: { refresh_token: "rt" } };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect((res.status as any)).toHaveBeenCalledWith(403);
  });

  it("ensureAdmin attaches adminUser and calls next for valid admin tokens", async () => {
    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: 1, admin: true } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1", role: "ADMIN" });
    const req: any = { cookies: { refresh_token: "rt" } };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect(req.adminUser).toEqual({ id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1", role: "ADMIN" });
    expect(next).toHaveBeenCalled();
  });

  it("ensureAdmin accepts numeric string sub values in jwt payload", async () => {
    vi.spyOn(jwt, "verify").mockReturnValueOnce({ sub: "1", admin: true } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 1,
      email: "admin@kcl.ac.uk",
      enterpriseId: "ent-1",
      role: "ADMIN",
    });
    const req: any = { cookies: { refresh_token: "rt" } };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await ensureAdmin(req, res, next);

    expect(req.adminUser).toEqual({ id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1", role: "ADMIN" });
    expect(next).toHaveBeenCalled();
  });

  it("ensureSuperAdmin allows only admin@kcl.ac.uk", () => {
    const next = vi.fn() as NextFunction;

    const deniedReq: any = { adminUser: { email: "manager@kcl.ac.uk" } };
    const deniedRes = mockRes();
    ensureSuperAdmin(deniedReq, deniedRes, next);
    expect((deniedRes.status as any)).toHaveBeenCalledWith(403);

    const allowedReq: any = { adminUser: { email: "ADMIN@KCL.AC.UK" } };
    const allowedRes = mockRes();
    ensureSuperAdmin(allowedReq, allowedRes, next);
    expect(next).toHaveBeenCalled();
  });

  it("summary route returns enterprise-scoped totals", async () => {
    const res = mockRes();

    await summary({ adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith({ users: 10, modules: 3, teams: 2, meetings: 1 });
  });

  it("users route maps isStaff flag from role", async () => {
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 1, email: "s@x.com", firstName: "S", lastName: "A", role: "STUDENT", active: true },
      { id: 2, email: "t@x.com", firstName: "T", lastName: "B", role: "STAFF", active: true },
    ]);
    const res = mockRes();

    await users({ adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1, isStaff: false, role: "STUDENT" }),
      expect.objectContaining({ id: 2, isStaff: true, role: "STAFF" }),
    ]);
  });

  it("own user search returns 400 for invalid filter payload", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({ ok: false, error: "bad filters" });
    const res = mockRes();

    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("own user search returns paginated payload", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: "a", role: "STUDENT", active: true, page: 2, pageSize: 10 },
    });
    (prisma.user.count as any).mockResolvedValueOnce(15);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 1, email: "a@x.com", firstName: "A", lastName: "B", role: "STUDENT", active: true },
    ]);
    const res = mockRes();

    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ total: 15, totalPages: 2, page: 2 }));
  });

  it("own user search falls back to fuzzy matching when strict search has no hits", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: "alce", role: null, active: null, page: 1, pageSize: 10 },
    });
    (prisma.user.count as any).mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    (prisma.user.findMany as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 1, email: "alice@x.com", firstName: "Alice", lastName: "B", role: "STAFF", active: true },
        { id: 2, email: "bob@x.com", firstName: "Bob", lastName: "C", role: "STAFF", active: true },
      ]);
    (matchesAdminUserSearchCandidate as any).mockImplementation((candidate: any) => candidate.id === 1);
    const res = mockRes();

    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        totalPages: 1,
        page: 1,
        items: [expect.objectContaining({ id: 1, email: "alice@x.com" })],
      }),
    );
  });

  it("enterprise search returns 400 for invalid filters", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({ ok: false, error: "bad filter" });
    const res = mockRes();

    await enterpriseSearch({ params: { enterpriseId: "ent-2" }, query: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("enterprise search returns 404 for unknown enterprise", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 5 },
    });
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    const res = mockRes();

    await enterpriseSearch({ params: { enterpriseId: "ent-2" }, query: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("enterprise search returns paginated users for valid enterprise", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 5 },
    });
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({ id: "ent-2" });
    (prisma.user.count as any).mockResolvedValueOnce(1);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STAFF", active: true },
    ]);
    const res = mockRes();

    await enterpriseSearch({ params: { enterpriseId: "ent-2" }, query: {} } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ total: 1, totalPages: 1 }));
  });

  it("patchRole validates id and role values", async () => {
    const invalidIdRes = mockRes();
    await patchRole({ params: { id: "bad" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, invalidIdRes);
    expect((invalidIdRes.status as any)).toHaveBeenCalledWith(400);

    const invalidRoleRes = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "OWNER" }, adminUser: { enterpriseId: "ent-1" } } as any, invalidRoleRes);
    expect((invalidRoleRes.status as any)).toHaveBeenCalledWith(400);

    const forbiddenRoleRes = mockRes();
    await patchRole({ params: { id: "2" }, body: { role: "ENTERPRISE_ADMIN" }, adminUser: { enterpriseId: "ent-1" } } as any, forbiddenRoleRes);
    expect((forbiddenRoleRes.status as any)).toHaveBeenCalledWith(400);
  });

  it("patchRole returns 404 when user is missing", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    const res = mockRes();

    await patchRole({ params: { id: "2" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("patchRole blocks updates to protected super-admin account", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "admin@kcl.ac.uk" });
    const res = mockRes();

    await patchRole({ params: { id: "2" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("patchRole updates role and returns mapped user payload", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 2, email: "u@x.com", role: "STAFF", active: true });
    const res = mockRes();

    await patchRole({ params: { id: "2" }, body: { role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 2, isStaff: true, role: "STAFF" }));
  });

  it("patchUser validates numeric id", async () => {
    const res = mockRes();

    await patchUser({ params: { id: "bad" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("patchUser returns 404 when target user is missing", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    const res = mockRes();

    await patchUser({ params: { id: "3" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("patchUser blocks edits to protected super-admin account", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 3, email: "admin@kcl.ac.uk" });
    const res = mockRes();

    await patchUser({ params: { id: "3" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("patchUser revokes refresh tokens when deactivating a user", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 3, email: "student@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 3, email: "student@x.com", role: "STAFF", active: false });
    const res = mockRes();

    await patchUser({ params: { id: "3" }, body: { active: false, role: "STAFF" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 3, revoked: false }, data: { revoked: true } });
  });

  it("patchUser maps ENTERPRISE_ADMIN role updates for non-admin users", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 4, email: "student@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 4, email: "student@x.com", role: "STUDENT", active: true });
    const res = mockRes();

    await patchUser({ params: { id: "4" }, body: { active: true, role: "ENTERPRISE_ADMIN" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 4, isStaff: false }));
  });
});
