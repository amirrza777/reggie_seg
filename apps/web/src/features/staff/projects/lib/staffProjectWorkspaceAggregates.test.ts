import { describe, expect, it } from "vitest";
import { staffProjectWorkspaceAggregates } from "./staffProjectWorkspaceAggregates";
import type { StaffProjectTeamsResponse } from "@/features/projects/types";

function buildResponse(overrides: Partial<StaffProjectTeamsResponse> = {}): StaffProjectTeamsResponse {
  return {
    project: { id: 1, name: "P", moduleId: 2, moduleName: "M", viewerAccessLabel: undefined },
    projectStudentCount: 0,
    unassignedProjectStudentCount: 0,
    teams: [],
    ...overrides,
  } as StaffProjectTeamsResponse;
}

describe("staffProjectWorkspaceAggregates", () => {
  it("counts teams and allocations", () => {
    const data = buildResponse({
      teams: [
        { id: 1, teamName: "A", allocations: [{ userId: 1 }, { userId: 2 }] } as StaffProjectTeamsResponse["teams"][number],
        { id: 2, teamName: "B", allocations: [] } as StaffProjectTeamsResponse["teams"][number],
      ],
    });
    expect(staffProjectWorkspaceAggregates(data)).toEqual({
      teamCount: 2,
      studentCount: 2,
      accessRoleLabel: "Staff access",
    });
  });

  it("uses viewerAccessLabel when present", () => {
    const data = buildResponse({
      project: { id: 1, name: "P", moduleId: 2, moduleName: "M", viewerAccessLabel: "Lead" },
    });
    expect(staffProjectWorkspaceAggregates(data).accessRoleLabel).toBe("Lead");
  });

  it("treats missing teams array as empty", () => {
    const data = { ...buildResponse(), teams: undefined as unknown as StaffProjectTeamsResponse["teams"] };
    expect(staffProjectWorkspaceAggregates(data)).toEqual({
      teamCount: 0,
      studentCount: 0,
      accessRoleLabel: "Staff access",
    });
  });
});
