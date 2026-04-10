import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  moduleLead: { deleteMany: vi.fn() },
  moduleTeachingAssistant: { deleteMany: vi.fn() },
  userModule: { deleteMany: vi.fn() },
  refreshToken: { updateMany: vi.fn() },
  enterprise: { upsert: vi.fn() },
  $transaction: vi.fn(),
}));

const argon2Mock = vi.hoisted(() => ({
  hash: vi.fn(),
}));

const authServiceMock = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("argon2", () => ({ default: argon2Mock }));
vi.mock("../../shared/db.js", () => ({ prisma: prismaMock }));
vi.mock("../../auth/service.js", () => authServiceMock);

import {
  createEnterpriseUser,
  parseEnterpriseUserSearchFilters,
  removeEnterpriseUser,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "./service.user-management.js";

const enterpriseAdminUser = { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } as const;
const platformAdminUser = { id: 1, enterpriseId: "ent-1", role: "ADMIN" } as const;
const staffUser = { id: 50, enterpriseId: "ent-1", role: "STAFF" } as const;

function makeSearchRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 17,
    email: "user@example.com",
    firstName: "User",
    lastName: "One",
    role: "STUDENT",
    active: true,
    enterpriseId: "ent-1",
    blockedEnterpriseId: null,
    ...overrides,
  };
}

describe("enterpriseAdmin service.user-management", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({
      id: 17,
      email: "user@example.com",
      firstName: "User",
      lastName: "One",
      role: "STUDENT",
      active: true,
    });
    prismaMock.user.create.mockResolvedValue({
      id: 200,
      email: "created@example.com",
      firstName: "Created",
      lastName: "User",
      role: "STUDENT",
      active: true,
    });

    prismaMock.moduleLead.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.moduleTeachingAssistant.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.userModule.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.enterprise.upsert.mockResolvedValue({ id: "ent-unassigned" });

    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));

    argon2Mock.hash.mockResolvedValue("hashed-password");
    authServiceMock.requestPasswordReset.mockResolvedValue(undefined);
  });

  it("parses enterprise search filters and validates invalid combinations", () => {
    expect(parseEnterpriseUserSearchFilters(undefined)).toEqual({
      ok: true,
      value: { query: null, sortBy: null, sortDirection: null, page: 1, pageSize: 25 },
    });

    expect(parseEnterpriseUserSearchFilters({ q: "x".repeat(121) })).toEqual({
      ok: false,
      error: "q must be 120 characters or fewer",
    });
    expect(parseEnterpriseUserSearchFilters({ page: "0" })).toEqual({ ok: false, error: "page must be a positive integer" });
    expect(parseEnterpriseUserSearchFilters({ pageSize: "200" })).toEqual({ ok: false, error: "pageSize must be 100 or less" });
    expect(parseEnterpriseUserSearchFilters({ sortBy: "bad" })).toEqual({ ok: false, error: "sortBy must be name or joinDate" });
    expect(parseEnterpriseUserSearchFilters({ sortDirection: "up" })).toEqual({ ok: false, error: "sortDirection must be asc or desc" });
    expect(parseEnterpriseUserSearchFilters({ sortDirection: "desc" })).toEqual({ ok: false, error: "sortDirection requires sortBy" });

    expect(parseEnterpriseUserSearchFilters({ sortBy: "joinDate" })).toEqual({
      ok: true,
      value: { query: null, sortBy: "joinDate", sortDirection: "desc", page: 1, pageSize: 25 },
    });

    expect(parseEnterpriseUserSearchFilters({ q: " student ", sortBy: "name", sortDirection: "desc", page: "2", pageSize: "10" })).toEqual({
      ok: true,
      value: { query: "student", sortBy: "name", sortDirection: "desc", page: 2, pageSize: 10 },
    });
  });

  it("forbids non-enterprise-admin searches", async () => {
    const result = await searchEnterpriseUsers(staffUser as any, {
      query: null,
      sortBy: null,
      sortDirection: null,
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });

  it("searches users with strict results and mapped membership status", async () => {
    prismaMock.user.count.mockResolvedValueOnce(2);
    prismaMock.user.findMany.mockResolvedValueOnce([
      makeSearchRecord({ id: 1, role: "STUDENT", active: true }),
      makeSearchRecord({ id: 2, role: "ADMIN", active: false, email: "admin@example.com" }),
    ]);

    const result = await searchEnterpriseUsers(enterpriseAdminUser as any, {
      query: "inactive",
      sortBy: "name",
      sortDirection: "desc",
      page: 1,
      pageSize: 10,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(2);
    expect(result.value.items[0]).toMatchObject({ id: 1, membershipStatus: "active", isStaff: false });
    expect(result.value.items[1]).toMatchObject({ id: 2, membershipStatus: "inactive", isStaff: true });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ firstName: "desc" }, { lastName: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("returns strict empty response when fuzzy fallback has no candidates or too many candidates", async () => {
    prismaMock.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce([]);

    const noCandidates = await searchEnterpriseUsers(enterpriseAdminUser as any, {
      query: "staff",
      sortBy: null,
      sortDirection: null,
      page: 1,
      pageSize: 10,
    });

    expect(noCandidates).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ total: 0, items: [] }) }),
    );

    prismaMock.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(5000);
    prismaMock.user.findMany.mockResolvedValueOnce([]);

    const tooManyCandidates = await searchEnterpriseUsers(enterpriseAdminUser as any, {
      query: "staff",
      sortBy: null,
      sortDirection: null,
      page: 1,
      pageSize: 10,
    });

    expect(tooManyCandidates).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ total: 0, items: [] }) }),
    );
  });

  it("uses fuzzy fallback and returns zero results when nothing matches", async () => {
    prismaMock.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeSearchRecord({ id: 10, email: "alpha@example.com", role: "STAFF", enterpriseActive: true }),
        makeSearchRecord({ id: 11, email: "beta@example.com", role: "STUDENT", enterpriseActive: true }),
      ]);

    const result = await searchEnterpriseUsers(enterpriseAdminUser as any, {
      query: "zzzz",
      sortBy: null,
      sortDirection: null,
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ total: 0, items: [] }) }),
    );
  });

  it("uses fuzzy fallback and returns ordered matching records", async () => {
    prismaMock.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeSearchRecord({ id: 41, email: "staff.one@example.com", firstName: "Staff", role: "STAFF" }),
        makeSearchRecord({ id: 42, email: "student.one@example.com", firstName: "Student", role: "STUDENT" }),
      ])
      .mockResolvedValueOnce([
        makeSearchRecord({ id: 41, email: "staff.one@example.com", firstName: "Staff", role: "STAFF" }),
      ]);

    const result = await searchEnterpriseUsers(enterpriseAdminUser as any, {
      query: "staff",
      sortBy: null,
      sortDirection: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(1);
    expect(result.value.items).toEqual([
      expect.objectContaining({ id: 41, role: "STAFF", isStaff: true, membershipStatus: "active" }),
    ]);
  });

  it("forbids non-admin user updates and handles update edge cases", async () => {
    const forbidden = await updateEnterpriseUser(staffUser as any, 17, { role: "STAFF" });
    expect(forbidden).toEqual({ ok: false, status: 403, error: "Forbidden" });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 99,
      email: "self@example.com",
      firstName: "Self",
      lastName: "User",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
    const selfRemove = await updateEnterpriseUser(enterpriseAdminUser as any, 99, { active: false });
    expect(selfRemove).toEqual({ ok: false, status: 400, error: "You cannot remove your own enterprise access" });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 17,
      email: "admin@kcl.ac.uk",
      firstName: "Admin",
      lastName: "Email",
      role: "STAFF",
      active: true,
    });
    const superAdminEmail = await updateEnterpriseUser(enterpriseAdminUser as any, 17, { role: "STAFF" });
    expect(superAdminEmail).toEqual({ ok: false, status: 400, error: "Cannot modify super admin" });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 18,
      email: "platform@example.com",
      firstName: "Platform",
      lastName: "Admin",
      role: "ADMIN",
      active: true,
    });
    const platformAdmin = await updateEnterpriseUser(enterpriseAdminUser as any, 18, { role: "STAFF" });
    expect(platformAdmin).toEqual({ ok: false, status: 403, error: "Cannot modify platform admin accounts" });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 19,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STUDENT",
      active: true,
    });
    const noChanges = await updateEnterpriseUser(enterpriseAdminUser as any, 19, {});
    expect(noChanges).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 19, membershipStatus: "active" }) }),
    );
  });

  it("handles reinstatement outcomes during updates", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 52,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-2",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "ENT2" },
    });

    const conflict = await updateEnterpriseUser(enterpriseAdminUser as any, 52, { active: true });
    expect(conflict).toEqual({ ok: false, status: 409, error: "User is in another enterprise" });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 53,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-unassigned",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "UNASSIGNED" },
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 53,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STAFF",
      active: true,
    });

    const reinstated = await updateEnterpriseUser(enterpriseAdminUser as any, 53, { active: true, role: "STAFF" });
    expect(reinstated).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 53, role: "STAFF", membershipStatus: "active" }) }),
    );
  });

  it("blocks enterprise-admin role updates and handles reinstate not-found paths", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 92,
      email: "ea@example.com",
      firstName: "Ent",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const inviteFlowOnly = await updateEnterpriseUser(platformAdminUser as any, 92, { role: "STAFF" });
    expect(inviteFlowOnly).toEqual({
      ok: false,
      status: 403,
      error: "Enterprise admin permissions are managed by invite flow",
    });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const missingReinstateCandidate = await updateEnterpriseUser(enterpriseAdminUser as any, 1002, { active: true });
    expect(missingReinstateCandidate).toEqual({ ok: false, status: 404, error: "User not found" });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1003,
      email: "platform@x.com",
      firstName: "Plat",
      lastName: "Form",
      role: "ADMIN",
      active: true,
      enterpriseId: "ent-unassigned",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "UNASSIGNED" },
    });
    const protectedCandidate = await updateEnterpriseUser(enterpriseAdminUser as any, 1003, { active: true });
    expect(protectedCandidate).toEqual({ ok: false, status: 404, error: "User not found" });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1004,
      email: "other@example.com",
      firstName: "Other",
      lastName: "Enterprise",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-2",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT2" },
    });
    const unavailableCandidate = await updateEnterpriseUser(enterpriseAdminUser as any, 1004, { active: true });
    expect(unavailableCandidate).toEqual({ ok: false, status: 404, error: "User not found" });
  });

  it("forbids non-admin creates and supports in-enterprise reinstatement", async () => {
    const forbidden = await createEnterpriseUser(staffUser as any, { email: "x@example.com" });
    expect(forbidden).toEqual({ ok: false, status: 403, error: "Forbidden" });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 77,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STUDENT",
      active: false,
      enterpriseId: "ent-1",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT1" },
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 77,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STAFF",
      active: true,
    });

    const updated = await createEnterpriseUser(enterpriseAdminUser as any, {
      email: "member@example.com",
      role: "STAFF",
      firstName: "Mem",
      lastName: "Ber",
    });

    expect(updated).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 77, role: "STAFF", membershipStatus: "active" }) }),
    );
  });

  it("handles conflicting and restricted account create paths", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 81,
        email: "conflict@example.com",
        firstName: "Con",
        lastName: "Flict",
        role: "STUDENT",
        active: true,
        enterpriseId: "ent-2",
        blockedEnterpriseId: null,
        enterprise: { code: "ENT2" },
      },
    ]);

    const conflict = await createEnterpriseUser(enterpriseAdminUser as any, { email: "conflict@example.com" });
    expect(conflict).toEqual({ ok: false, status: 409, error: "This email is already used in another enterprise" });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 82,
        email: "enterprise.admin@example.com",
        firstName: "Ent",
        lastName: "Admin",
        role: "ENTERPRISE_ADMIN",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      },
    ]);

    const inviteManaged = await createEnterpriseUser(enterpriseAdminUser as any, { email: "enterprise.admin@example.com" });
    expect(inviteManaged).toEqual({ ok: false, status: 403, error: "Enterprise admin permissions are managed by invite flow" });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    prismaMock.user.create.mockRejectedValueOnce({ code: "P2002" });

    const duplicateCreate = await createEnterpriseUser(enterpriseAdminUser as any, { email: "duplicate@example.com" });
    expect(duplicateCreate).toEqual({ ok: false, status: 409, error: "This email is already in use" });
  });

  it("handles guarded create paths for platform-admin accounts and non-unique errors", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 201,
      email: "platform@example.com",
      firstName: "Plat",
      lastName: "Form",
      role: "ADMIN",
      active: true,
      enterpriseId: "ent-1",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT1" },
    });
    const inEnterprisePlatformAdmin = await createEnterpriseUser(enterpriseAdminUser as any, { email: "platform@example.com" });
    expect(inEnterprisePlatformAdmin).toEqual({
      ok: false,
      status: 403,
      error: "Cannot modify platform admin accounts",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 202,
        email: "global-platform@example.com",
        firstName: "Global",
        lastName: "Platform",
        role: "ADMIN",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      },
    ]);
    const reinstatedPlatformAdmin = await createEnterpriseUser(enterpriseAdminUser as any, { email: "global-platform@example.com" });
    expect(reinstatedPlatformAdmin).toEqual({
      ok: false,
      status: 403,
      error: "Cannot modify platform admin accounts",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    prismaMock.user.create.mockRejectedValueOnce(new Error("db write failed"));
    await expect(createEnterpriseUser(enterpriseAdminUser as any, { email: "fail@example.com" })).rejects.toThrow("db write failed");
  });

  it("creates fresh accounts when no existing matches exist", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 99,
      email: "new@example.com",
      firstName: "",
      lastName: "",
      role: "STUDENT",
      active: true,
    });

    const created = await createEnterpriseUser(enterpriseAdminUser as any, { email: " New@Example.com " });

    expect(created).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 99, email: "new@example.com" }) }),
    );
    expect(argon2Mock.hash).toHaveBeenCalled();
    expect(authServiceMock.requestPasswordReset).toHaveBeenCalledWith("new@example.com");
  });

  it("forbids non-admin removes and handles not-found plus success removal", async () => {
    const forbidden = await removeEnterpriseUser(staffUser as any, 18);
    expect(forbidden).toEqual({ ok: false, status: 403, error: "Forbidden" });

    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    const missing = await removeEnterpriseUser(enterpriseAdminUser as any, 18);
    expect(missing).toEqual({ ok: false, status: 404, error: "User not found" });

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 18,
      email: "staff@example.com",
      firstName: "Sta",
      lastName: "Ff",
      role: "STAFF",
      active: true,
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 18,
      email: "staff@example.com",
      firstName: "Sta",
      lastName: "Ff",
      role: "STUDENT",
      active: true,
    });

    const removed = await removeEnterpriseUser(platformAdminUser as any, 18);
    expect(removed).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 18, membershipStatus: "left", role: "STUDENT" }) }),
    );

    expect(prismaMock.moduleLead.deleteMany).toHaveBeenCalled();
    expect(prismaMock.enterprise.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "UNASSIGNED" } }),
    );
  });
});
