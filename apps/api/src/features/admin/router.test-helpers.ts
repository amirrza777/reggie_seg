import type { Response } from "express";
import jwt from "jsonwebtoken";
import { vi } from "vitest";
import router from "./router.js";

const mocks = vi.hoisted(() => ({
  generateFromNameMock: vi.fn(),
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
  listAuditLogs: vi.fn(),
  buildAdminUserSearchOrderBy: vi.fn(),
  buildAdminUserSearchWhere: vi.fn(),
  parseAdminUserSearchFilters: vi.fn(),
  matchesAdminUserSearchCandidate: vi.fn(),
}));

vi.mock("../../shared/db.js", () => ({
  prisma: mocks.prisma,
}));

vi.mock("../audit/service.js", () => ({ listAuditLogs: mocks.listAuditLogs }));
vi.mock("./userSearch.js", () => ({
  buildAdminUserSearchOrderBy: mocks.buildAdminUserSearchOrderBy,
  buildAdminUserSearchWhere: mocks.buildAdminUserSearchWhere,
  parseAdminUserSearchFilters: mocks.parseAdminUserSearchFilters,
  matchesAdminUserSearchCandidate: mocks.matchesAdminUserSearchCandidate,
}));
vi.mock("../services/enterprise/enterpriseCodeGeneratorService.js", () => ({
  EnterpriseCodeGeneratorService: vi.fn().mockImplementation(() => ({ generateFromName: mocks.generateFromNameMock })),
}));

export function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

export function getUseHandlers() {
  return (router as any).stack.filter((layer: any) => !layer.route).map((layer: any) => layer.handle);
}

export function getRouteHandler(method: "get" | "post" | "patch" | "delete", path: string) {
  const layer = (router as any).stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  return layer.route.stack[0].handle;
}

export function setupAdminRouterTestDefaults() {
  vi.clearAllMocks();

  vi.spyOn(jwt, "verify").mockReturnValue({ sub: 1, admin: true } as any);

  (mocks.prisma.user.findUnique as any).mockResolvedValue({
    id: 1,
    email: "admin@kcl.ac.uk",
    enterpriseId: "ent-1",
    role: "ADMIN",
  });

  (mocks.prisma.user.count as any).mockResolvedValue(10);
  (mocks.prisma.module.count as any).mockResolvedValue(3);
  (mocks.prisma.team.count as any).mockResolvedValue(2);
  (mocks.prisma.meeting.count as any).mockResolvedValue(1);

  (mocks.prisma.user.findMany as any).mockResolvedValue([]);
  (mocks.prisma.user.findFirst as any).mockResolvedValue(null);
  (mocks.prisma.user.update as any).mockResolvedValue({ id: 2, email: "u@x.com", role: "STAFF", active: true });
  (mocks.prisma.refreshToken.updateMany as any).mockResolvedValue({ count: 1 });

  (mocks.prisma.featureFlag.findMany as any).mockResolvedValue([]);
  (mocks.prisma.featureFlag.update as any).mockResolvedValue({ key: "peer_feedback", label: "Peer feedback", enabled: true });
  (mocks.prisma.featureFlag.deleteMany as any).mockResolvedValue({ count: 1 });
  (mocks.prisma.featureFlag.createMany as any).mockResolvedValue({ count: 3 });

  (mocks.prisma.enterprise.findMany as any).mockResolvedValue([]);
  (mocks.prisma.enterprise.findUnique as any).mockResolvedValue(null);
  (mocks.prisma.enterprise.count as any).mockResolvedValue(0);
  (mocks.prisma.enterprise.delete as any).mockResolvedValue({ id: "ent-1" });
  (mocks.prisma.enterprise.create as any).mockResolvedValue({ id: "ent-2", code: "ENT2", name: "Enterprise 2", createdAt: new Date() });

  (mocks.prisma.auditLog.deleteMany as any).mockResolvedValue({ count: 0 });

  (mocks.parseAdminUserSearchFilters as any).mockReturnValue({
    ok: true,
    value: { query: null, role: null, active: null, page: 1, pageSize: 10 },
  });
  (mocks.buildAdminUserSearchOrderBy as any).mockReturnValue([{ id: "asc" }]);
  (mocks.buildAdminUserSearchWhere as any).mockReturnValue({ enterpriseId: "ent-1" });
  (mocks.matchesAdminUserSearchCandidate as any).mockReturnValue(false);

  (mocks.prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(mocks.prisma);
  });

  (mocks.listAuditLogs as any).mockResolvedValue([]);
  mocks.generateFromNameMock.mockResolvedValue("AUTO123");
}

export const prisma = mocks.prisma as any;
export const listAuditLogs = mocks.listAuditLogs;
export const buildAdminUserSearchOrderBy = mocks.buildAdminUserSearchOrderBy;
export const buildAdminUserSearchWhere = mocks.buildAdminUserSearchWhere;
export const parseAdminUserSearchFilters = mocks.parseAdminUserSearchFilters;
export const matchesAdminUserSearchCandidate = mocks.matchesAdminUserSearchCandidate;
export const getGenerateFromNameMock = () => mocks.generateFromNameMock;
