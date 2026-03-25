import { beforeEach, describe, expect, it } from "vitest";
import {
  getGenerateFromNameMock,
  getRouteHandler,
  listAuditLogs,
  mockRes,
  prisma,
  setupAdminRouterTestDefaults,
} from "./router.test-helpers.js";

beforeEach(() => {
  setupAdminRouterTestDefaults();
});

describe("admin router enterprise and audit routes", () => {
  const listEnterprises = getRouteHandler("get", "/enterprises");
  const searchEnterprises = getRouteHandler("get", "/enterprises/search");
  const createEnterprise = getRouteHandler("post", "/enterprises");
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
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    (prisma.enterprise.create as any).mockResolvedValueOnce({
      id: "new-ent",
      code: "AUTO123",
      name: "Auto Enterprise",
      createdAt: new Date("2026-01-02"),
    });
    const res = mockRes();

    await createEnterprise({ body: { name: "Auto Enterprise" } } as any, res);

    expect(getGenerateFromNameMock()).toHaveBeenCalledWith("Auto Enterprise");
    expect((res.status as any)).toHaveBeenCalledWith(201);
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

  it("returns 404 when listing users for missing enterprise", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    const res = mockRes();

    await listEnterpriseUsers({ params: { enterpriseId: "ent-missing" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("lists enterprise users with isStaff mapping", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({ id: "ent-2" });
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STUDENT", active: true },
    ]);
    const res = mockRes();

    await listEnterpriseUsers({ params: { enterpriseId: "ent-2" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith([expect.objectContaining({ isStaff: false })]);
  });

  it("validates patchEnterpriseUser id", async () => {
    const res = mockRes();
    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "bad" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when patchEnterpriseUser target is missing", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    const res = mockRes();

    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("blocks patchEnterpriseUser updates for protected admin account", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "admin@kcl.ac.uk" });
    const res = mockRes();

    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("updates enterprise user and returns mapped payload", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    (prisma.user.update as any).mockResolvedValueOnce({ id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "ADMIN", active: false });
    const res = mockRes();

    await patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: { active: false, role: "ADMIN" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ isStaff: true }));
  });

  it("validates deleteEnterprise target id", async () => {
    const res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("forbids deleting the current admin enterprise", async () => {
    const res = mockRes();
    await deleteEnterprise({ params: { enterpriseId: "ent-1" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when deleteEnterprise target is missing", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce(null);
    const res = mockRes();

    await deleteEnterprise({ params: { enterpriseId: "ent-missing" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("rejects deleteEnterprise when active related records exist", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({
      id: "ent-busy",
      _count: { users: 1, modules: 0, teams: 0, auditLogs: 0 },
    });
    const res = mockRes();

    await deleteEnterprise({ params: { enterpriseId: "ent-busy" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("deletes enterprise audit logs before deletion when present", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({
      id: "ent-clean",
      _count: { users: 0, modules: 0, teams: 0, auditLogs: 2 },
    });
    const res = mockRes();

    await deleteEnterprise({ params: { enterpriseId: "ent-clean" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-clean" } });
  });

  it("deletes enterprise when no dependent records remain", async () => {
    (prisma.enterprise.findUnique as any).mockResolvedValueOnce({
      id: "ent-clean2",
      _count: { users: 0, modules: 0, teams: 0, auditLogs: 0 },
    });
    const res = mockRes();

    await deleteEnterprise({ params: { enterpriseId: "ent-clean2" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith({ success: true });
  });

  it("requires enterprise context for audit logs", async () => {
    const res = mockRes();

    await auditLogs({ adminUser: undefined, query: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(500);
  });

  it("parses audit-log filters and maps response payload", async () => {
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
    const res = mockRes();

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
});
