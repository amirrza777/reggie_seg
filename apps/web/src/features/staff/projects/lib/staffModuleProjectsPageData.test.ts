import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import {
  buildModuleGroups,
  loadStaffProjectsWithTeamsForPage,
  mapProjectsToModuleCards,
  toStaffLoadErrorMessage,
  type StaffProjectWithTeams,
} from "./staffModuleProjectsPageData";

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjects: vi.fn(),
  getStaffProjectTeams: vi.fn(),
}));

const getStaffProjectsMock = vi.mocked(getStaffProjects);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

function projectRow(overrides: Partial<StaffProjectWithTeams> = {}): StaffProjectWithTeams {
  return {
    id: 10,
    name: "Zeta",
    moduleId: 1,
    moduleName: "Alpha mod",
    teamCount: 0,
    hasGithubRepo: false,
    membersTotal: 0,
    membersConnected: 0,
    teams: [],
    teamFetchFailed: false,
    ...overrides,
  };
}

describe("toStaffLoadErrorMessage", () => {
  it("maps 401 ApiError to session copy", () => {
    expect(toStaffLoadErrorMessage(new ApiError("x", { status: 401 }), "fallback")).toBe(
      "Your session has expired. Please sign in again.",
    );
  });

  it("prefers Error message when present", () => {
    expect(toStaffLoadErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("uses fallback for unknown errors", () => {
    expect(toStaffLoadErrorMessage("x", "fallback")).toBe("fallback");
  });
});

describe("mapProjectsToModuleCards", () => {
  it("sorts by name and maps team metadata", () => {
    const cards = mapProjectsToModuleCards([
      projectRow({ id: 2, name: "B" }),
      projectRow({ id: 1, name: "A", teams: [{ id: 9, teamName: "T", memberCount: 2, hasRepo: true, trelloBoardId: null }] }),
    ]);
    expect(cards.map((c) => c.name)).toEqual(["A", "B"]);
    expect(cards[0].visibleTeams).toHaveLength(1);
    expect(cards[0].teamFetchFailed).toBe(false);
  });
});

describe("buildModuleGroups", () => {
  it("groups by module and sorts modules and projects", () => {
    const groups = buildModuleGroups([
      projectRow({ id: 1, name: "P2", moduleId: 2, moduleName: "M2" }),
      projectRow({ id: 2, name: "P1", moduleId: 2, moduleName: "M2" }),
      projectRow({ id: 3, name: "Solo", moduleId: 9, moduleName: "A first" }),
    ]);
    expect(groups.map((g) => g.moduleName)).toEqual(["A first", "M2"]);
    expect(groups[1].projects.map((p) => p.name)).toEqual(["P1", "P2"]);
  });
});

describe("loadStaffProjectsWithTeamsForPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes by moduleId and attaches sorted team rows", async () => {
    getStaffProjectsMock.mockResolvedValue([
      { id: 1, name: "P", moduleId: 5, moduleName: "M", teamCount: 0, hasGithubRepo: true, membersTotal: 0, membersConnected: 0 },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 1, name: "P", moduleId: 5 },
      teams: [
        { id: 2, teamName: "B", allocations: [{}], trelloBoardId: "tb" },
        { id: 1, teamName: "A", allocations: [{}, {}], trelloBoardId: null },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const { projects, errorMessage } = await loadStaffProjectsWithTeamsForPage(99, { moduleId: 5 });
    expect(errorMessage).toBeNull();
    expect(projects).toHaveLength(1);
    expect(projects[0].teams.map((t) => t.teamName)).toEqual(["A", "B"]);
    expect(projects[0].teams[0].memberCount).toBe(2);
    expect(projects[0].teams[0].hasRepo).toBe(true);
    expect(projects[0].teamFetchFailed).toBe(false);
  });

  it("marks teamFetchFailed when team load throws", async () => {
    getStaffProjectsMock.mockResolvedValue([
      { id: 1, name: "P", moduleId: 5, moduleName: "M", teamCount: 0, hasGithubRepo: false, membersTotal: 0, membersConnected: 0 },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("nope"));

    const { projects } = await loadStaffProjectsWithTeamsForPage(1, {});
    expect(projects[0].teams).toEqual([]);
    expect(projects[0].teamFetchFailed).toBe(true);
  });

  it("returns errorMessage when getStaffProjects fails", async () => {
    getStaffProjectsMock.mockRejectedValue(new ApiError("bad", { status: 500 }));
    const { projects, errorMessage } = await loadStaffProjectsWithTeamsForPage(1, {});
    expect(projects).toEqual([]);
    expect(errorMessage).toBe("bad");
  });
});
