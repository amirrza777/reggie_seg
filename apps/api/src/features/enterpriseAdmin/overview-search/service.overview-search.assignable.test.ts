import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
  accessSearch: {
    buildEnterpriseAccessUserSearchWhere: vi.fn(),
    matchesEnterpriseAccessUserSearchCandidate: vi.fn(),
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mockState.prisma }));
vi.mock("../accessUserSearch.js", () => mockState.accessSearch);

import {
  listAssignableUsersByEnterprise,
  runFuzzyAssignableUserSearch,
} from "./service.overview-search.assignable.js";
import { DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES } from "../../../shared/fuzzyFallback.js";

describe("enterpriseAdmin assignable overview search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.accessSearch.buildEnterpriseAccessUserSearchWhere.mockReturnValue({});
    mockState.accessSearch.matchesEnterpriseAccessUserSearchCandidate.mockReturnValue(true);
  });

  it("sorts fuzzy matches by pin priority, active state, names, and email", async () => {
    mockState.prisma.user.count.mockResolvedValueOnce(4);
    mockState.prisma.user.findMany.mockResolvedValueOnce([
      { id: 3, email: "c@x.com", firstName: "A", lastName: "A", active: true },
      { id: 1, email: "z@x.com", firstName: "A", lastName: "A", active: true },
      { id: 2, email: "b@x.com", firstName: "A", lastName: "A", active: false },
      { id: 4, email: "a@x.com", firstName: "A", lastName: "B", active: true },
    ]);

    const strictResponse = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
      query: "a",
      scope: "all",
    };

    const result = await runFuzzyAssignableUserSearch(
      "ent-1",
      {
        scope: "all",
        query: "a",
        page: 1,
        pageSize: 10,
        prioritiseUserIds: [3],
      },
      strictResponse,
    );

    expect(result.items.map((item) => item.id)).toEqual([3, 1, 4, 2]);
    expect(mockState.accessSearch.buildEnterpriseAccessUserSearchWhere).toHaveBeenCalledWith(
      "ent-1",
      { scope: "all", query: null },
      undefined,
    );
  });

  it("returns strict response when candidate pool is empty and lists assignable user groups", async () => {
    mockState.prisma.user.count.mockResolvedValueOnce(0);

    const strictResponse = {
      items: [{ id: 99 }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      query: "z",
      scope: "staff",
    } as any;

    const fuzzy = await runFuzzyAssignableUserSearch(
      "ent-1",
      { scope: "staff", query: "z", page: 1, pageSize: 10, prioritiseUserIds: [99] },
      strictResponse,
      44,
    );
    expect(fuzzy).toBe(strictResponse);
    expect(mockState.accessSearch.buildEnterpriseAccessUserSearchWhere).toHaveBeenCalledWith(
      "ent-1",
      { scope: "staff", query: null },
      { excludeEnrolledInModuleId: 44, excludeOnModuleParticipation: "all" },
    );

    mockState.prisma.user.findMany
      .mockResolvedValueOnce([{ id: 10, email: "staff@x.com", firstName: "Staff", lastName: "One", active: true }])
      .mockResolvedValueOnce([{ id: 20, email: "student@x.com", firstName: "Student", lastName: "One", active: true }]);

    const groups = await listAssignableUsersByEnterprise("ent-1");
    expect(groups.staff).toHaveLength(1);
    expect(groups.students).toHaveLength(1);
  });

  it("returns strict response when fuzzy candidate pool is above max fallback threshold", async () => {
    mockState.prisma.user.count.mockResolvedValueOnce(DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES + 1);

    const strictResponse = {
      items: [{ id: 1 }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      query: "abc",
      scope: "all",
    } as any;

    const result = await runFuzzyAssignableUserSearch(
      "ent-1",
      { scope: "all", query: "abc", page: 1, pageSize: 10, prioritiseUserIds: [] },
      strictResponse,
    );

    expect(result).toBe(strictResponse);
    expect(mockState.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("sorts fuzzy matches by firstName, then lastName, then email for non-pinned ties", async () => {
    mockState.prisma.user.count.mockResolvedValueOnce(4);
    mockState.prisma.user.findMany.mockResolvedValueOnce([
      { id: 10, email: "zeta@example.com", firstName: "Amy", lastName: "Zeal", active: true },
      { id: 11, email: "alpha@example.com", firstName: "Amy", lastName: "Zeal", active: true },
      { id: 12, email: "beta@example.com", firstName: "Amy", lastName: "Able", active: true },
      { id: 13, email: "gamma@example.com", firstName: "Ben", lastName: "Able", active: true },
    ]);

    const strictResponse = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
      query: "a",
      scope: "all",
    } as any;

    const result = await runFuzzyAssignableUserSearch(
      "ent-1",
      {
        scope: "all",
        query: "a",
        page: 1,
        pageSize: 10,
        prioritiseUserIds: [999],
      },
      strictResponse,
    );

    expect(result.items.map((item) => item.id)).toEqual([12, 11, 10, 13]);
  });
});
