import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {},
  fuzzySearch: {
    matchesFuzzySearchCandidate: vi.fn(),
    parsePositiveIntegerSearchQuery: vi.fn(),
  },
  fuzzyFallback: {
    applyFuzzyFallback: vi.fn(),
  },
  highAuthorship: {
    getStaffProjectsImpl: vi.fn(),
    getStaffProjectsForMarkingImpl: vi.fn(),
  },
  staffScope: {
    getScopedStaffUser: vi.fn(),
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mockState.prisma }));
vi.mock("../../../shared/fuzzySearch.js", () => mockState.fuzzySearch);
vi.mock("../../../shared/fuzzyFallback.js", () => mockState.fuzzyFallback);
vi.mock("./repo.highAuthorship.js", () => mockState.highAuthorship);
vi.mock("./repo.staff-scope.js", () => mockState.staffScope);

import { getStaffProjects, getStaffProjectsForMarking } from "./repo.staff-projects.js";

describe("projects repo.staff-projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.fuzzySearch.matchesFuzzySearchCandidate.mockReturnValue(true);
  });

  it("forwards dependencies to getStaffProjectsImpl and exposes project matching behavior", async () => {
    mockState.highAuthorship.getStaffProjectsImpl.mockImplementationOnce(async (deps: any) => {
      expect(deps.userId).toBe(7);
      expect(deps.options).toEqual({ query: "proj", moduleId: 22 });
      expect(deps.getScopedStaffUser).toBe(mockState.staffScope.getScopedStaffUser);
      expect(deps.parsePositiveIntegerSearchQuery).toBe(mockState.fuzzySearch.parsePositiveIntegerSearchQuery);
      expect(deps.prisma).toBe(mockState.prisma);
      expect(deps.applyFuzzyFallback).toBe(mockState.fuzzyFallback.applyFuzzyFallback);
      expect(
        deps.matchesStaffProjectSearchQuery({ id: 10, name: "Project One", module: { name: "Module A" } }, "proj"),
      ).toBe(true);
      return [{ id: 10 }];
    });

    const result = await getStaffProjects(7, { query: "proj", moduleId: 22 });
    expect(result).toEqual([{ id: 10 }]);
    expect(mockState.highAuthorship.getStaffProjectsImpl).toHaveBeenCalledTimes(1);
    expect(mockState.fuzzySearch.matchesFuzzySearchCandidate).toHaveBeenCalled();
  });

  it("forwards dependencies to getStaffProjectsForMarkingImpl and exposes marking matcher", async () => {
    mockState.highAuthorship.getStaffProjectsForMarkingImpl.mockImplementationOnce(async (deps: any) => {
      expect(deps.userId).toBe(8);
      expect(deps.options).toEqual({ query: "team" });
      expect(
        deps.matchesMarkingProjectSearchQuery(
          {
            id: 11,
            name: "Project Two",
            module: { name: "Module B" },
            teams: [{ teamName: "Team A" }, { teamName: "Team B" }],
          },
          "team",
        ),
      ).toBe(true);
      return [{ id: 11 }];
    });

    const result = await getStaffProjectsForMarking(8, { query: "team" });
    expect(result).toEqual([{ id: 11 }]);
    expect(mockState.highAuthorship.getStaffProjectsForMarkingImpl).toHaveBeenCalledTimes(1);
    expect(mockState.fuzzySearch.matchesFuzzySearchCandidate).toHaveBeenCalled();
  });
});
