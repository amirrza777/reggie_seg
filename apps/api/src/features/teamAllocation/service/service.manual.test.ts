import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertProjectMutableForWrites: vi.fn(),
  repo: {
    applyManualAllocationTeam: vi.fn(),
    findModuleStudentsForManualAllocation: vi.fn(),
    findProjectTeamSummaries: vi.fn(),
    findStaffScopedProject: vi.fn(),
  },
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWrites: mocks.assertProjectMutableForWrites,
}));

vi.mock("../repo/repo.js", () => ({
  applyManualAllocationTeam: mocks.repo.applyManualAllocationTeam,
  findModuleStudentsForManualAllocation: mocks.repo.findModuleStudentsForManualAllocation,
  findProjectTeamSummaries: mocks.repo.findProjectTeamSummaries,
  findStaffScopedProject: mocks.repo.findStaffScopedProject,
}));

import { applyManualAllocationForProject, getManualAllocationWorkspaceForProject } from "./service.manual.js";

const project = {
  id: 2,
  name: "Project",
  moduleId: 3,
  moduleName: "Module",
  enterpriseId: "ent-1",
};

describe("service.manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repo.findStaffScopedProject.mockResolvedValue(project);
    mocks.repo.findModuleStudentsForManualAllocation.mockResolvedValue([
      { id: 11, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", currentTeamId: null, currentTeamName: null },
      { id: 12, firstName: "Bob", lastName: "Stone", email: "bob@example.com", currentTeamId: 7, currentTeamName: "Blue" },
    ]);
    mocks.repo.findProjectTeamSummaries.mockResolvedValue([{ id: 7, teamName: "Blue", memberCount: 1 }]);
    mocks.repo.applyManualAllocationTeam.mockResolvedValue({ id: 7, teamName: "Blue", memberCount: 2 });
  });

  it("rejects empty team names", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "", studentIds: [1] })).rejects.toMatchObject({
      code: "INVALID_TEAM_NAME",
    });
  });

  it("rejects non-positive and duplicate student ids", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [0] })).rejects.toMatchObject({
      code: "INVALID_STUDENT_IDS",
    });
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [2, 2] })).rejects.toMatchObject({
      code: "INVALID_STUDENT_IDS",
    });
  });

  it("rejects inaccessible projects for workspace and apply", async () => {
    mocks.repo.findStaffScopedProject.mockResolvedValue(null);
    await expect(getManualAllocationWorkspaceForProject(1, 2)).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Blue", studentIds: [11] })).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("rejects search queries longer than 120 chars", async () => {
    await expect(getManualAllocationWorkspaceForProject(1, 2, "x".repeat(121))).rejects.toEqual({ code: "INVALID_SEARCH_QUERY" });
  });

  it("builds workspace with team status counts", async () => {
    const workspace = await getManualAllocationWorkspaceForProject(1, 2, " ada ");
    expect(workspace.counts).toEqual({ totalStudents: 2, availableStudents: 1, alreadyInTeamStudents: 1 });
    expect(workspace.students[1]).toEqual(expect.objectContaining({ status: "ALREADY_IN_TEAM" }));
    expect(mocks.repo.findModuleStudentsForManualAllocation).toHaveBeenCalledWith("ent-1", 3, 2, "ada");
  });

  it("loads workspace without search filter when query is blank", async () => {
    await getManualAllocationWorkspaceForProject(1, 2, "   ");
    expect(mocks.repo.findModuleStudentsForManualAllocation).toHaveBeenCalledWith("ent-1", 3, 2);
  });

  it("rejects students outside module", async () => {
    mocks.repo.findModuleStudentsForManualAllocation.mockResolvedValue([
      { id: 11, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", currentTeamId: null, currentTeamName: null },
    ]);
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Blue", studentIds: [11, 99] })).rejects.toEqual({
      code: "STUDENT_NOT_IN_MODULE",
    });
  });

  it("rejects students already assigned", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Blue", studentIds: [12] })).rejects.toEqual({
      code: "STUDENT_ALREADY_ASSIGNED",
    });
  });

  it("applies manual allocation with draft creator id", async () => {
    const applied = await applyManualAllocationForProject(5, 2, { teamName: " Blue ", studentIds: [11] });
    expect(applied).toEqual(expect.objectContaining({ team: { id: 7, teamName: "Blue", memberCount: 2 } }));
    expect(mocks.repo.applyManualAllocationTeam).toHaveBeenCalledWith(2, "ent-1", "Blue", [11], { draftCreatedById: 5 });
  });
});