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
  sendPasswordSetupEmail: vi.fn(),
  sendEnterpriseAdminPromotionEmail: vi.fn(),
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
import { registerServiceUserManagementExtraTests } from "./service.user-management.additional-cases.js";

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
    authServiceMock.sendPasswordSetupEmail.mockResolvedValue(undefined);
    authServiceMock.sendEnterpriseAdminPromotionEmail.mockResolvedValue(undefined);
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

  registerServiceUserManagementExtraTests({
    createEnterpriseUser,
    enterpriseAdminUser,
    platformAdminUser,
    prismaMock,
    staffUser,
    argon2Mock,
    authServiceMock,
    removeEnterpriseUser,
    updateEnterpriseUser,
  });
});
