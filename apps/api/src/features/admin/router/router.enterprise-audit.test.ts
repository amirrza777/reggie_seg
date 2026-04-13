import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import router from "../router.js";
import { prisma } from "../../../shared/db.js";
import { listAuditLogs } from "../../audit/service.js";
import {
  buildAdminUserSearchOrderBy,
  buildAdminUserSearchWhere,
  matchesAdminUserSearchCandidate,
  parseAdminUserSearchFilters,
} from "../userSearch.js";
import { registerRouterEnterpriseAuditExtraTests } from "./router.enterprise-audit.additional-cases.js";

const { generateFromNameMock } = vi.hoisted(() => ({ generateFromNameMock: vi.fn() }));

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    module: { count: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    globalAdminInviteToken: { updateMany: vi.fn(), create: vi.fn() },
    featureFlag: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    enterprise: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), delete: vi.fn(), create: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    auditLogIntegrity: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../audit/service.js", () => ({ listAuditLogs: vi.fn(), recordAuditLog: vi.fn() }));
vi.mock("../userSearch.js", () => ({
  buildAdminUserSearchOrderBy: vi.fn(),
  buildAdminUserSearchWhere: vi.fn(),
  parseAdminUserSearchFilters: vi.fn(),
  matchesAdminUserSearchCandidate: vi.fn(),
}));
vi.mock("../enterpriseCodeGeneratorService.js", () => ({
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
  (prisma.globalAdminInviteToken.updateMany as any).mockResolvedValue({ count: 0 });
  (prisma.globalAdminInviteToken.create as any).mockResolvedValue({
    id: 1,
    email: "invite@example.com",
    expiresAt: new Date("2026-04-15T00:00:00.000Z"),
  });

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

describe("admin router enterprise and audit routes", () => {
  const listEnterprises = getRouteHandler("get", "/enterprises");
  const searchEnterprises = getRouteHandler("get", "/enterprises/search");
  const createEnterprise = getRouteHandler("post", "/enterprises");
  const inviteCurrentEnterpriseAdmin = getRouteHandler("post", "/invites/enterprise-admin");
  const inviteGlobalAdmin = getRouteHandler("post", "/invites/global-admin");
  const inviteEnterpriseAdmin = getRouteHandler("post", "/enterprises/:enterpriseId/invites/enterprise-admin");
  const listEnterpriseUsers = getRouteHandler("get", "/enterprises/:enterpriseId/users");
  const patchEnterpriseUser = getRouteHandler("patch", "/enterprises/:enterpriseId/users/:id");
  const deleteEnterprise = getRouteHandler("delete", "/enterprises/:enterpriseId");
  const auditLogs = getRouteHandler("get", "/audit-logs");

  it("lists enterprises with role counts", async () => {
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

    const res = mockRes();
    await listEnterprises({} as any, res);

    expect((res.json as any)).toHaveBeenCalledWith([
      expect.objectContaining({ admins: 1, enterpriseAdmins: 1, staff: 1, students: 1 }),
    ]);
    expect(prisma.enterprise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ code: { not: "UNASSIGNED" } }]),
        }),
      }),
    );
  });

  it("rejects invalid enterprise-search pagination", async () => {
    const res = mockRes();
    await searchEnterprises({ query: { page: "0" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns paginated enterprise search results", async () => {
    (prisma.enterprise.count as any).mockResolvedValueOnce(2);
    (prisma.enterprise.findMany as any).mockResolvedValueOnce([
      {
        id: "ent-3",
        code: "ENT3",
        name: "Enterprise Three",
        createdAt: new Date("2026-01-03"),
        users: [{ role: "STAFF" }],
        _count: { users: 1, modules: 0, teams: 0 },
      },
    ]);

    const res = mockRes();
    await searchEnterprises({ query: { q: "staff", page: "1", pageSize: "1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
        items: [expect.objectContaining({ id: "ent-3", staff: 1 })],
      }),
    );
    expect(prisma.enterprise.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ code: { not: "UNASSIGNED" } }]),
        }),
      }),
    );
    expect(prisma.enterprise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ code: { not: "UNASSIGNED" } }]),
        }),
      }),
    );
  });

  it("falls back to fuzzy enterprise search when strict search has no hits", async () => {
    (prisma.enterprise.count as any).mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    (prisma.enterprise.findMany as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "ent-3",
          code: "ENT3",
          name: "King's College London",
        },
        {
          id: "ent-4",
          code: "ENT4",
          name: "Example Enterprise",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "ent-3",
          code: "ENT3",
          name: "King's College London",
          createdAt: new Date("2026-01-04"),
          users: [{ role: "STAFF" }],
          _count: { users: 1, modules: 0, teams: 0 },
        },
      ]);

    const res = mockRes();
    await searchEnterprises({ query: { q: "kings collge london", page: "1", pageSize: "10" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        items: [expect.objectContaining({ id: "ent-3" })],
      }),
    );
    expect(prisma.enterprise.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ code: { not: "UNASSIGNED" } }]),
        }),
      }),
    );
    expect(prisma.enterprise.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ code: { not: "UNASSIGNED" } }]),
        }),
      }),
    );
  });

  it.each([
    { body: {}, expected: 400 },
    { body: { name: "x".repeat(121) }, expected: 400 },
    { body: { name: "Enterprise", code: "bad#" }, expected: 400 },
  ])("validates createEnterprise payload %#", async ({ body, expected }) => {
    const res = mockRes();
    await createEnterprise({ body } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(expected);
  });

  it("rejects duplicate enterprise code", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({ id: "exists" });
    const res = mockRes();

    await createEnterprise({ body: { name: "Enterprise", code: "ENT1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(409);
  });

  it("creates enterprise with generated code when code is omitted", async () => {
    (prisma.enterprise.create as any).mockResolvedValueOnce({
      id: "new-ent",
      code: "AUTO123",
      name: "Auto Enterprise",
      createdAt: new Date("2026-01-02"),
    });
    const res = mockRes();

    await createEnterprise({ body: { name: "Auto Enterprise" } } as any, res);

    expect(generateFromNameMock).toHaveBeenCalledWith("Auto Enterprise");
    expect((res.status as any)).toHaveBeenCalledWith(201);
  });

  it("retries generated enterprise codes when a concurrent code collision happens", async () => {
    generateFromNameMock.mockResolvedValueOnce("AUTO123").mockResolvedValueOnce("AUTO124");
    (prisma.$transaction as any)
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["code"] } })
      .mockImplementation(async (arg: any) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg(prisma);
      });
    (prisma.enterprise.create as any).mockResolvedValueOnce({
      id: "new-ent-2",
      code: "AUTO124",
      name: "Auto Enterprise Retry",
      createdAt: new Date("2026-01-03"),
    });
    const res = mockRes();

    await createEnterprise({ body: { name: "Auto Enterprise Retry" } } as any, res);

    expect(generateFromNameMock).toHaveBeenCalledTimes(2);
    expect((res.status as any)).toHaveBeenCalledWith(201);
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ code: "AUTO124" }));
  });

  it("maps unique-constraint errors from create enterprise", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    (prisma.$transaction as any).mockRejectedValueOnce({ code: "P2002" });
    const res = mockRes();

    await createEnterprise({ body: { name: "E", code: "EEE" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(409);
  });

  it("maps unknown create-enterprise errors to 500", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    (prisma.$transaction as any).mockRejectedValueOnce(new Error("db"));
    const res = mockRes();

    await createEnterprise({ body: { name: "E", code: "EEE" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(500);
  });

  registerRouterEnterpriseAuditExtraTests({
    auditLogs,
    createEnterprise,
    deleteEnterprise,
    inviteCurrentEnterpriseAdmin,
    inviteEnterpriseAdmin,
    inviteGlobalAdmin,
    listEnterpriseUsers,
    patchEnterpriseUser,
    mockRes,
    prisma: prisma as any,
    listAuditLogs,
  });
});
