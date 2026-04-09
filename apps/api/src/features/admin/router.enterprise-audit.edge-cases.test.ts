import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import router from "./router.js";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";
import {
  buildAdminUserSearchOrderBy,
  buildAdminUserSearchWhere,
  matchesAdminUserSearchCandidate,
  parseAdminUserSearchFilters,
} from "./userSearch.js";

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
    auditLogIntegrity: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../audit/service.js", () => ({ listAuditLogs: vi.fn() }));
vi.mock("./userSearch.js", () => ({
  buildAdminUserSearchOrderBy: vi.fn(),
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

function getRouteHandler(method: "get" | "post" | "patch" | "delete", path: string) {
  const layer = (router as any).stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
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
  (prisma.auditLogIntegrity.deleteMany as any).mockResolvedValue({ count: 0 });

  (parseAdminUserSearchFilters as any).mockReturnValue({
    ok: true,
    value: { query: null, role: null, active: null, page: 1, pageSize: 10 },
  });
  (buildAdminUserSearchOrderBy as any).mockReturnValue([{ id: "asc" }]);
  (buildAdminUserSearchWhere as any).mockReturnValue({ enterpriseId: "ent-1" });
  (matchesAdminUserSearchCandidate as any).mockReturnValue(false);

  (prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(prisma);
  });

  (listAuditLogs as any).mockResolvedValue([]);
  generateFromNameMock.mockResolvedValue("AUTO123");
});

describe("admin router enterprise/audit edge cases", () => {
  const patchRole = getRouteHandler("patch", "/users/:id/role");
  const patchUser = getRouteHandler("patch", "/users/:id");
  const listEnterpriseUsers = getRouteHandler("get", "/enterprises/:enterpriseId/users");
  const enterpriseSearch = getRouteHandler("get", "/enterprises/:enterpriseId/users/search");
  const patchEnterpriseUser = getRouteHandler("patch", "/enterprises/:enterpriseId/users/:id");
  const ownSearch = getRouteHandler("get", "/users/search");
  const auditLogs = getRouteHandler("get", "/audit-logs");

  it("requires role in patchRole payload", async () => {
    const res = mockRes();
    await patchRole({ params: { id: "2" }, body: {}, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("allows patchUser active updates when user exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: 5, email: "u@x.com", enterpriseId: "ent-1", role: "STUDENT", active: true });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 5, email: "u@x.com", role: "STUDENT", active: true });
    const res = mockRes();

    await patchUser({ params: { id: "5" }, body: { active: true }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));
  });

  it("requires enterpriseId for enterprise users route", async () => {
    const res = mockRes();
    await listEnterpriseUsers({ params: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("requires enterpriseId for enterprise scoped user search", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 5 },
    });
    const res = mockRes();

    await enterpriseSearch({ params: {}, query: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("requires enterpriseId in patchEnterpriseUser route params", async () => {
    const res = mockRes();
    await patchEnterpriseUser({ params: { id: "2" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("updates enterprise user active flag", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 2,
      email: "u@x.com",
      firstName: "U",
      lastName: "X",
      role: "STUDENT",
      active: true,
    });
    const res = mockRes();

    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: { active: true } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("returns empty pagination metadata from own scoped user search", async () => {
    (parseAdminUserSearchFilters as any).mockReturnValueOnce({
      ok: true,
      value: { query: null, role: null, active: null, page: 1, pageSize: 10 },
    });
    (prisma.user.count as any).mockResolvedValueOnce(0);
    (prisma.user.findMany as any).mockResolvedValueOnce([]);
    const res = mockRes();

    await ownSearch({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ total: 0, totalPages: 0, hasNextPage: false }),
    );
  });

  it("passes parsed audit log dates with invalid to date omitted", async () => {
    (listAuditLogs as any).mockResolvedValueOnce([]);
    const res = mockRes();

    await auditLogs({ adminUser: { enterpriseId: "ent-1" }, query: { from: "2026-03-01", to: "bad-date" } } as any, res);

    expect(listAuditLogs).toHaveBeenLastCalledWith({
      enterpriseId: "ent-1",
      from: new Date("2026-03-01"),
      to: undefined,
      limit: undefined,
    });
  });

  it("passes undefined audit filters when no query is supplied", async () => {
    (listAuditLogs as any).mockResolvedValueOnce([]);
    const res = mockRes();

    await auditLogs({ adminUser: { enterpriseId: "ent-1" }, query: {} } as any, res);

    expect(listAuditLogs).toHaveBeenLastCalledWith({
      enterpriseId: "ent-1",
      from: undefined,
      to: undefined,
      limit: undefined,
    });
  });
});
