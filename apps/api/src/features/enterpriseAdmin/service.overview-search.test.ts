import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    featureFlag: { findMany: vi.fn(), update: vi.fn() },
    module: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    $transaction: vi.fn(),
  },
  fuzzy: {
    shouldUseFuzzyFallback: vi.fn(),
    fuzzyFilterAndPaginate: vi.fn(),
  },
  accessSearch: {
    buildEnterpriseAccessUserSearchWhere: vi.fn(),
    matchesEnterpriseAccessUserSearchCandidate: vi.fn(),
    parseEnterpriseAccessUserSearchFilters: vi.fn(),
  },
  moduleSearch: {
    buildEnterpriseModuleSearchWhere: vi.fn(),
    matchesEnterpriseModuleSearchCandidate: vi.fn(),
    parseEnterpriseModuleSearchFilters: vi.fn(),
  },
  helpers: {
    getUtcStartOfDaysAgo: vi.fn(),
  },
  core: {
    buildManagedModuleSelect: vi.fn(),
    buildModuleScopeWhere: vi.fn(),
    mapModuleRecord: vi.fn(),
    toEnterpriseAccessUserSearchResponse: vi.fn(),
    toEnterpriseModuleSearchResponse: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: mockState.prisma }));
vi.mock("../../shared/fuzzyFallback.js", () => ({
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES: 100,
  shouldUseFuzzyFallback: mockState.fuzzy.shouldUseFuzzyFallback,
  fuzzyFilterAndPaginate: mockState.fuzzy.fuzzyFilterAndPaginate,
}));
vi.mock("./accessUserSearch.js", () => ({
  buildEnterpriseAccessUserSearchWhere: mockState.accessSearch.buildEnterpriseAccessUserSearchWhere,
  matchesEnterpriseAccessUserSearchCandidate: mockState.accessSearch.matchesEnterpriseAccessUserSearchCandidate,
  parseEnterpriseAccessUserSearchFilters: mockState.accessSearch.parseEnterpriseAccessUserSearchFilters,
}));
vi.mock("./moduleSearch.js", () => ({
  buildEnterpriseModuleSearchWhere: mockState.moduleSearch.buildEnterpriseModuleSearchWhere,
  matchesEnterpriseModuleSearchCandidate: mockState.moduleSearch.matchesEnterpriseModuleSearchCandidate,
  parseEnterpriseModuleSearchFilters: mockState.moduleSearch.parseEnterpriseModuleSearchFilters,
}));
vi.mock("./service.helpers.js", () => ({
  getUtcStartOfDaysAgo: mockState.helpers.getUtcStartOfDaysAgo,
  isEnterpriseAdminRole: (role: string) => role === "ENTERPRISE_ADMIN" || role === "ADMIN",
  normalizeFeatureFlagLabel: (flag: any) => (flag.key === "repos" && flag.label === "Repos" ? { ...flag, label: "Repositories" } : flag),
}));
vi.mock("./service.core.js", () => ({
  buildManagedModuleSelect: mockState.core.buildManagedModuleSelect,
  buildModuleScopeWhere: mockState.core.buildModuleScopeWhere,
  mapModuleRecord: mockState.core.mapModuleRecord,
  toEnterpriseAccessUserSearchResponse: mockState.core.toEnterpriseAccessUserSearchResponse,
  toEnterpriseModuleSearchResponse: mockState.core.toEnterpriseModuleSearchResponse,
}));

import {
  getOverview,
  listAssignableUsers,
  listFeatureFlags,
  listModules,
  parseAccessUserSearchFilters,
  parseModuleSearchFilters,
  searchAssignableUsers,
  searchModules,
  updateFeatureFlag,
} from "./service.overview-search.js";

const adminUser = { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } as const;
const staffUser = { id: 44, enterpriseId: "ent-1", role: "STAFF" } as const;

beforeEach(() => {
  vi.clearAllMocks();

  mockState.prisma.$transaction.mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(mockState.prisma);
  });

  mockState.helpers.getUtcStartOfDaysAgo.mockReturnValue(new Date("2026-02-23T00:00:00.000Z"));

  mockState.core.buildModuleScopeWhere.mockImplementation((enterpriseUser: any) => ({ enterpriseId: enterpriseUser.enterpriseId }));
  mockState.core.buildManagedModuleSelect.mockReturnValue({ id: true, name: true, moduleLeads: true });
  mockState.core.mapModuleRecord.mockImplementation((module: any) => ({ id: module.id, name: module.name }));
  mockState.core.toEnterpriseModuleSearchResponse.mockImplementation((items: any[], filters: any, total: number) => ({
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  }));
  mockState.core.toEnterpriseAccessUserSearchResponse.mockImplementation((items: any[], filters: any, total: number) => ({
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    scope: filters.scope,
  }));

  mockState.moduleSearch.buildEnterpriseModuleSearchWhere.mockImplementation((_base: any, _filters: any) => ({ strict: true }));
  mockState.moduleSearch.parseEnterpriseModuleSearchFilters.mockReturnValue({ ok: true, value: { query: null, page: 1, pageSize: 10 } });
  mockState.accessSearch.buildEnterpriseAccessUserSearchWhere.mockImplementation((enterpriseId: string, filters: any, options?: any) => ({
    enterpriseId,
    scope: filters.scope,
    query: filters.query,
    options,
  }));
  mockState.accessSearch.parseEnterpriseAccessUserSearchFilters.mockReturnValue({
    ok: true,
    value: { scope: "all", query: null, page: 1, pageSize: 20 },
  });

  mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValue(false);
  mockState.fuzzy.fuzzyFilterAndPaginate.mockReturnValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });

  mockState.prisma.featureFlag.findMany.mockResolvedValue([]);
  mockState.prisma.featureFlag.update.mockResolvedValue({ key: "repos", label: "Repos", enabled: true });

  mockState.prisma.module.count.mockResolvedValue(0);
  mockState.prisma.module.findMany.mockResolvedValue([]);
  mockState.prisma.module.findFirst.mockResolvedValue({ id: 7 });

  mockState.prisma.user.count.mockResolvedValue(0);
  mockState.prisma.user.findMany.mockResolvedValue([]);
  mockState.prisma.team.count.mockResolvedValue(0);
  mockState.prisma.meeting.count.mockResolvedValue(0);
});

describe("enterpriseAdmin service.overview-search", () => {
  it("returns forbidden for non-admin feature flag operations", async () => {
    await expect(listFeatureFlags(staffUser as any)).resolves.toEqual({ ok: false, status: 403, error: "Forbidden" });
    await expect(updateFeatureFlag(staffUser as any, "repos", true)).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("lists and updates feature flags with label normalization", async () => {
    mockState.prisma.featureFlag.findMany.mockResolvedValueOnce([{ key: "repos", label: "Repos", enabled: true }]);

    await expect(listFeatureFlags(adminUser as any)).resolves.toEqual({
      ok: true,
      value: [{ key: "repos", label: "Repositories", enabled: true }],
    });

    await expect(updateFeatureFlag(adminUser as any, "repos", false)).resolves.toEqual({
      ok: true,
      value: { key: "repos", label: "Repositories", enabled: true },
    });
  });

  it("maps P2025 to not-found and rethrows unexpected update errors", async () => {
    mockState.prisma.featureFlag.update.mockRejectedValueOnce({ code: "P2025" });
    await expect(updateFeatureFlag(adminUser as any, "missing", true)).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Feature flag not found",
    });

    mockState.prisma.featureFlag.update.mockRejectedValueOnce(new Error("boom"));
    await expect(updateFeatureFlag(adminUser as any, "repos", true)).rejects.toThrow("boom");
  });

  it("builds overview counts payload", async () => {
    mockState.prisma.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(15)
      .mockResolvedValueOnce(5);
    mockState.prisma.module.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    mockState.prisma.team.count.mockResolvedValueOnce(9);
    mockState.prisma.meeting.count.mockResolvedValueOnce(25);

    const result = await getOverview(adminUser as any);

    expect(mockState.helpers.getUtcStartOfDaysAgo).toHaveBeenCalledWith(30);
    expect(result).toEqual({
      totals: {
        users: 100,
        activeUsers: 80,
        students: 60,
        staff: 30,
        enterpriseAdmins: 10,
        modules: 12,
        teams: 9,
        meetings: 25,
      },
      hygiene: {
        inactiveUsers: 20,
        studentsWithoutModule: 15,
        modulesWithoutStudents: 3,
      },
      trends: {
        newUsers30d: 5,
        newModules30d: 2,
      },
    });
  });

  it("lists modules with canManageAccess mapping", async () => {
    mockState.prisma.module.findMany.mockResolvedValueOnce([
      { id: 1, name: "A", moduleLeads: [] },
      { id: 2, name: "B", moduleLeads: [{ userId: 44 }] },
    ]);

    await expect(listModules(staffUser as any)).resolves.toEqual([
      { id: 1, name: "A", canManageAccess: false },
      { id: 2, name: "B", canManageAccess: true },
    ]);
  });

  it("parses module and access-user filters via delegated parsers", () => {
    parseModuleSearchFilters({ q: "abc" });
    expect(mockState.moduleSearch.parseEnterpriseModuleSearchFilters).toHaveBeenCalledWith({ q: "abc" });

    parseAccessUserSearchFilters({ scope: "staff" });
    expect(mockState.accessSearch.parseEnterpriseAccessUserSearchFilters).toHaveBeenCalledWith({ scope: "staff" });
  });

  it("returns strict module search results when fuzzy fallback is disabled", async () => {
    mockState.prisma.module.count.mockResolvedValueOnce(2);
    mockState.prisma.module.findMany.mockResolvedValueOnce([{ id: 7, name: "Software", moduleLeads: [] }]);
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValueOnce(false);

    const result = await searchModules(adminUser as any, { query: "soft", page: 1, pageSize: 10 });

    expect(result).toEqual(
      expect.objectContaining({ total: 2, items: [expect.objectContaining({ id: 7, canManageAccess: true })] }),
    );
  });

  it("returns strict response when fuzzy module candidate set is too large", async () => {
    mockState.prisma.module.count.mockResolvedValueOnce(0).mockResolvedValueOnce(101);
    mockState.prisma.module.findMany.mockResolvedValueOnce([]);
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValueOnce(true);

    const result = await searchModules(adminUser as any, { query: "x", page: 1, pageSize: 10 });

    expect(result).toEqual(expect.objectContaining({ total: 0, items: [] }));
  });

  it("uses fuzzy module search and preserves fuzzy ordering", async () => {
    mockState.prisma.module.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    mockState.prisma.module.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 8, name: "Internet Systems" },
        { id: 7, name: "Software Engineering" },
      ])
      .mockResolvedValueOnce([
        { id: 8, name: "Internet Systems", moduleLeads: [] },
      ]);
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValueOnce(true);
    mockState.fuzzy.fuzzyFilterAndPaginate.mockReturnValueOnce({
      items: [{ id: 8, name: "Internet Systems" }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const result = await searchModules(adminUser as any, { query: "internt systms", page: 1, pageSize: 10 });

    expect(result).toEqual(
      expect.objectContaining({ total: 1, items: [expect.objectContaining({ id: 8, canManageAccess: true })] }),
    );
  });

  it("lists assignable staff and students", async () => {
    mockState.prisma.user.findMany.mockResolvedValueOnce([{ id: 11 }]).mockResolvedValueOnce([{ id: 31 }]);

    await expect(listAssignableUsers(adminUser as any)).resolves.toEqual({ staff: [{ id: 11 }], students: [{ id: 31 }] });
  });

  it("searches assignable users without fuzzy fallback and clears invalid exclude module", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);
    mockState.prisma.user.count.mockResolvedValueOnce(2);
    mockState.prisma.user.findMany.mockResolvedValueOnce([{ id: 11, email: "a@x.com", firstName: "A", lastName: "B", active: true }]);
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValueOnce(false);

    const filters = { scope: "staff", query: "a", page: 1, pageSize: 10, excludeEnrolledInModuleId: 999 } as any;
    const result = await searchAssignableUsers(adminUser as any, filters);

    expect(result).toEqual(expect.objectContaining({ total: 2, items: [expect.objectContaining({ id: 11 })] }));
    expect(mockState.accessSearch.buildEnterpriseAccessUserSearchWhere).toHaveBeenCalledWith(
      "ent-1",
      expect.objectContaining({ scope: "staff", query: "a" }),
      undefined,
    );
  });

  it("returns strict assignable-user response when fuzzy candidate count is zero", async () => {
    mockState.prisma.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockState.prisma.user.findMany.mockResolvedValueOnce([]);
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValueOnce(true);

    const result = await searchAssignableUsers(adminUser as any, {
      scope: "all",
      query: "none",
      page: 1,
      pageSize: 20,
    } as any);

    expect(result).toEqual(expect.objectContaining({ total: 0, items: [] }));
  });

  it("uses fuzzy assignable-user search when strict search has no hits", async () => {
    mockState.prisma.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    mockState.prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 11, email: "nora@x.com", firstName: "Nora", lastName: "Patel", active: true },
        { id: 12, email: "bob@x.com", firstName: "Bob", lastName: "Stone", active: true },
      ]);
    mockState.fuzzy.shouldUseFuzzyFallback.mockReturnValueOnce(true);
    mockState.fuzzy.fuzzyFilterAndPaginate.mockReturnValueOnce({
      items: [{ id: 11, email: "nora@x.com", firstName: "Nora", lastName: "Patel", active: true }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const result = await searchAssignableUsers(adminUser as any, {
      scope: "all",
      query: "nra patl",
      page: 1,
      pageSize: 20,
    } as any);

    expect(result).toEqual(expect.objectContaining({ total: 1, items: [expect.objectContaining({ id: 11 })] }));
  });
});
