import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  audit: {
    listAuditLogs: vi.fn(),
    recordAuditLog: vi.fn(),
  },
  repo: {
    listUsers: vi.fn(),
    listUsersByEnterprise: vi.fn(),
    countUsersByWhere: vi.fn(),
    listUsersByWhere: vi.fn(),
    findUserById: vi.fn(),
    updateUser: vi.fn(),
    revokeActiveRefreshTokens: vi.fn(),
    countEnterprisesByWhere: vi.fn(),
    listEnterprisesByWhere: vi.fn(),
    listEnterpriseFuzzyCandidatesByWhere: vi.fn(),
    listEnterprisesByIds: vi.fn(),
    findEnterpriseById: vi.fn(),
    findUserByEnterpriseAndEmail: vi.fn(),
    findUserByEmail: vi.fn(),
    createEnterpriseAdminInviteToken: vi.fn(),
    listUsersByEmail: vi.fn(),
    createGlobalAdminInviteToken: vi.fn(),
  },
  fuzzy: {
    DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES: 200,
    fuzzyFilterAndPaginate: vi.fn(),
    shouldUseFuzzyFallback: vi.fn(),
  },
  email: {
    sendEmail: vi.fn(),
  },
  enterpriseCodeGenerator: {
    EnterpriseCodeGeneratorService: class {
      generateFromName = vi.fn(async () => "AUTO123");
    },
  },
}));

vi.mock("../audit/service.js", () => mockState.audit);
vi.mock("./repo.js", () => mockState.repo);
vi.mock("../../shared/fuzzyFallback.js", () => mockState.fuzzy);
vi.mock("../../shared/email.js", () => mockState.email);
vi.mock("./enterpriseCodeGeneratorService.js", () => mockState.enterpriseCodeGenerator);

import {
  inviteEnterpriseAdmin,
  inviteGlobalAdmin,
  listUsers,
  searchEnterprises,
  searchUsers,
  updateOwnEnterpriseUser,
  updateOwnEnterpriseUserRole,
} from "./service.js";

describe("admin service coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValue(false);
    mockState.repo.listUsers.mockResolvedValue([]);
    mockState.repo.listUsersByEnterprise.mockResolvedValue([]);
    mockState.repo.listUsersByWhere.mockResolvedValue([]);
    mockState.repo.countUsersByWhere.mockResolvedValue(0);
    mockState.repo.findUserById.mockResolvedValue(null);
    mockState.repo.countEnterprisesByWhere.mockResolvedValue(0);
    mockState.repo.listEnterprisesByWhere.mockResolvedValue([]);
    mockState.repo.listEnterpriseFuzzyCandidatesByWhere.mockResolvedValue([]);
    mockState.repo.listEnterprisesByIds.mockResolvedValue([]);
    mockState.repo.findEnterpriseById.mockResolvedValue(null);
    mockState.repo.findUserByEnterpriseAndEmail.mockResolvedValue(null);
    mockState.repo.findUserByEmail.mockResolvedValue(null);
    mockState.repo.listUsersByEmail.mockResolvedValue([]);
  });

  it("resolves user listing scope for default, enterprise actor, and super-admin actor", async () => {
    await listUsers();
    await listUsers({ enterpriseId: "ent-1", email: "staff@example.com" });
    await listUsers({ enterpriseId: "ent-1", email: "admin@kcl.ac.uk" });

    expect(mockState.repo.listUsers).toHaveBeenCalledTimes(2);
    expect(mockState.repo.listUsersByEnterprise).toHaveBeenCalledWith("ent-1");
  });

  it("returns strict user search result when fuzzy candidate pool is empty", async () => {
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValue(true);
    mockState.repo.countUsersByWhere.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
    mockState.repo.listUsersByWhere.mockResolvedValueOnce([
      {
        id: 1,
        email: "u@example.com",
        firstName: "U",
        lastName: "One",
        role: "STAFF",
        active: true,
        enterpriseId: "ent-1",
      },
    ]);

    const result = await searchUsers({
      query: "u",
      role: null,
      active: null,
      page: 1,
      pageSize: 20,
      sort: "name",
      direction: "asc",
    });

    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(1);
    expect(mockState.repo.countUsersByWhere).toHaveBeenCalledTimes(2);
  });

  it("blocks role updates when actor cannot manage user scope or protected admin accounts", async () => {
    mockState.repo.findUserById
      .mockResolvedValueOnce({ id: 2, email: "a@x.com", enterpriseId: "ent-2", role: "STAFF", active: true })
      .mockResolvedValueOnce({ id: 3, email: "admin2@x.com", enterpriseId: "ent-1", role: "ADMIN", active: true });

    const outOfScope = await updateOwnEnterpriseUserRole(2, "STAFF", { enterpriseId: "ent-1", email: "owner@x.com" });
    const protectedAdmin = await updateOwnEnterpriseUserRole(3, "STAFF", {
      enterpriseId: "ent-1",
      email: "owner@x.com",
    });

    expect(outOfScope).toEqual({ ok: false, status: 404, error: "User not found" });
    expect(protectedAdmin).toEqual({ ok: false, status: 403, error: "Cannot modify platform admin accounts" });
  });

  it("blocks enterprise user updates for scope and role-assignment constraints", async () => {
    mockState.repo.findUserById
      .mockResolvedValueOnce({ id: 10, email: "u@x.com", enterpriseId: "ent-9", role: "STAFF", active: true })
      .mockResolvedValueOnce({ id: 11, email: "a@x.com", enterpriseId: "ent-1", role: "ADMIN", active: true })
      .mockResolvedValueOnce({ id: 12, email: "s@x.com", enterpriseId: "ent-1", role: "STAFF", active: true });

    const outOfScope = await updateOwnEnterpriseUser(10, { active: true }, { enterpriseId: "ent-1", email: "staff@x.com" });
    const adminBlocked = await updateOwnEnterpriseUser(11, { active: true }, { enterpriseId: "ent-1", email: "staff@x.com" });
    const roleBlocked = await updateOwnEnterpriseUser(12, { role: "ADMIN" }, { enterpriseId: "ent-1", email: "staff@x.com" });

    expect(outOfScope).toEqual({ ok: false, status: 404, error: "User not found" });
    expect(adminBlocked).toEqual({ ok: false, status: 403, error: "Cannot modify platform admin accounts" });
    expect(roleBlocked).toEqual({ ok: false, status: 403, error: "Role not assignable" });
  });

  it("returns strict enterprise search response when fuzzy fallback has no candidates and empty page IDs", async () => {
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValue(true);
    mockState.repo.countEnterprisesByWhere.mockResolvedValueOnce(3).mockResolvedValueOnce(0).mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    mockState.repo.listEnterprisesByWhere.mockResolvedValue([
      {
        id: "ent-1",
        code: "ENT1",
        name: "Enterprise One",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        users: [{ role: "STAFF" }],
        _count: { users: 1, modules: 0, teams: 0 },
      },
    ]);
    mockState.repo.listEnterpriseFuzzyCandidatesByWhere.mockResolvedValue([
      { id: "ent-1", code: "ENT1", name: "Enterprise One" },
      { id: "ent-2", code: "ENT2", name: "Enterprise Two" },
    ]);
    mockState.fuzzy.fuzzyFilterAndPaginate
      .mockReturnValueOnce({ items: [], total: 0 })
      .mockReturnValueOnce({ items: [], total: 0 });

    const first = await searchEnterprises({ query: "one", page: 1, pageSize: 10 });
    const second = await searchEnterprises({ query: "two", page: 1, pageSize: 10 });

    expect(first.items).toHaveLength(1);
    expect(second.items).toEqual([]);
  });

  it("validates enterprise-admin invite input and enterprise/user collision checks", async () => {
    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "a@x.com" })).toEqual({
      ok: false,
      status: 401,
      error: "Not authenticated",
    });
    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "   " }, 1)).toEqual({
      ok: false,
      status: 400,
      error: "Email is required",
    });
    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "bad" }, 1)).toEqual({
      ok: false,
      status: 400,
      error: "Email must be a valid email address",
    });

    mockState.repo.findEnterpriseById.mockResolvedValueOnce(null);
    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "x@example.com" }, 1)).toEqual({
      ok: false,
      status: 404,
      error: "Enterprise not found",
    });

    mockState.repo.findEnterpriseById.mockResolvedValue({ id: "ent-1", name: "Enterprise One" });
    mockState.repo.findUserByEnterpriseAndEmail.mockResolvedValueOnce({ id: 9, role: "ENTERPRISE_ADMIN" });
    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "x@example.com" }, 1)).toEqual({
      ok: false,
      status: 409,
      error: "User already has enterprise admin access",
    });

    mockState.repo.findUserByEnterpriseAndEmail.mockResolvedValueOnce(null);
    mockState.repo.listUsersByEmail.mockResolvedValueOnce([
      {
        id: 10,
        enterpriseId: "ent-2",
        role: "STAFF",
        enterprise: { code: "ENT2" },
      },
    ]);
    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "x@example.com" }, 1)).toEqual({
      ok: false,
      status: 409,
      error: "This email is already used in another enterprise. Invite a different email.",
    });
  });

  it("sends enterprise-admin invite email and records audit logs on success", async () => {
    mockState.repo.findEnterpriseById.mockResolvedValue({ id: "ent-1", name: "Enterprise One" });
    mockState.repo.findUserByEnterpriseAndEmail.mockResolvedValue(null);
    mockState.repo.listUsersByEmail.mockResolvedValue([]);
    mockState.repo.createEnterpriseAdminInviteToken.mockResolvedValue({ id: 1 });

    const result = await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "Invite@Example.com" }, 55);

    expect(result.ok).toBe(true);
    expect(mockState.repo.createEnterpriseAdminInviteToken).toHaveBeenCalled();
    expect(mockState.email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "invite@example.com",
        subject: "Enterprise admin invite",
      }),
    );
    expect(mockState.audit.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 55, enterpriseId: "ent-1", action: "USER_UPDATED" }),
    );
  });

  it("blocks enterprise-admin invite when multiple cross-enterprise accounts share the same email", async () => {
    mockState.repo.findEnterpriseById.mockResolvedValue({ id: "ent-1", name: "Enterprise One" });
    mockState.repo.findUserByEnterpriseAndEmail.mockResolvedValue(null);
    mockState.repo.listUsersByEmail.mockResolvedValueOnce([
      { id: 11, enterpriseId: "ent-unassigned-a", role: "STUDENT", enterprise: { code: "UNASSIGNED" } },
      { id: 12, enterpriseId: "ent-unassigned-b", role: "STAFF", enterprise: { code: "UNASSIGNED" } },
    ]);

    expect(await inviteEnterpriseAdmin({ enterpriseId: "ent-1", email: "multi@example.com" }, 1)).toEqual({
      ok: false,
      status: 409,
      error: "Multiple accounts use this email. Invite a different email.",
    });
  });

  it("validates global-admin invite authorization and enterprise-account conflicts", async () => {
    expect(await inviteGlobalAdmin({ email: "x@example.com" }, {})).toEqual({
      ok: false,
      status: 401,
      error: "Not authenticated",
    });
    expect(await inviteGlobalAdmin({ email: "x@example.com" }, { id: 1, email: "staff@example.com" })).toEqual({
      ok: false,
      status: 403,
      error: "Only the super admin can invite global admins.",
    });
    expect(await inviteGlobalAdmin({ email: "   " }, { id: 1, email: "admin@kcl.ac.uk" })).toEqual({
      ok: false,
      status: 400,
      error: "Email is required",
    });

    mockState.repo.listUsersByEmail.mockResolvedValueOnce([{ id: 1, role: "ADMIN", enterprise: { code: "ENT1" } }]);
    expect(await inviteGlobalAdmin({ email: "a@example.com" }, { id: 1, email: "admin@kcl.ac.uk" })).toEqual({
      ok: false,
      status: 409,
      error: "User already has global admin access",
    });

    mockState.repo.listUsersByEmail.mockResolvedValueOnce([{ id: 2, role: "STAFF", enterprise: { code: "ENT1" } }]);
    expect(await inviteGlobalAdmin({ email: "a@example.com" }, { id: 1, email: "admin@kcl.ac.uk" })).toEqual({
      ok: false,
      status: 409,
      error: "This email already belongs to an enterprise account. Use a different email.",
    });
  });

  it("blocks global-admin invite when multiple accounts share the same email", async () => {
    mockState.repo.listUsersByEmail.mockResolvedValueOnce([
      { id: 31, role: "STUDENT", enterprise: { code: "UNASSIGNED" } },
      { id: 32, role: "STAFF", enterprise: { code: "UNASSIGNED" } },
    ]);

    expect(await inviteGlobalAdmin({ email: "multi@example.com" }, { id: 1, email: "admin@kcl.ac.uk" })).toEqual({
      ok: false,
      status: 409,
      error: "Multiple accounts use this email. Invite a different email.",
    });
  });
});
