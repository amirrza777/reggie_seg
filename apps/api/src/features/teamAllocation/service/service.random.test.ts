import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertProjectMutableForWrites: vi.fn(),
  repo: {
    applyRandomAllocationPlan: vi.fn(),
    findProjectTeamSummaries: vi.fn(),
    findStaffScopedProject: vi.fn(),
    findVacantModuleStudentsForProject: vi.fn(),
  },
  shared: {
    buildConstrainedRandomPlan: vi.fn(),
    normalizeTeamSizeConstraints: vi.fn(),
  },
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWrites: mocks.assertProjectMutableForWrites,
}));

vi.mock("../repo/repo.js", () => ({
  applyRandomAllocationPlan: mocks.repo.applyRandomAllocationPlan,
  findProjectTeamSummaries: mocks.repo.findProjectTeamSummaries,
  findStaffScopedProject: mocks.repo.findStaffScopedProject,
  findVacantModuleStudentsForProject: mocks.repo.findVacantModuleStudentsForProject,
}));

vi.mock("./service.shared.js", () => ({
  buildConstrainedRandomPlan: mocks.shared.buildConstrainedRandomPlan,
  normalizeTeamSizeConstraints: mocks.shared.normalizeTeamSizeConstraints,
}));

import { applyRandomAllocationForProject, previewRandomAllocationForProject } from "./service.random.js";

const project = {
  id: 2,
  name: "Project",
  moduleId: 3,
  moduleName: "Module",
  enterpriseId: "ent-1",
};

const students = [
  { id: 11, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
  { id: 12, firstName: "Bob", lastName: "Stone", email: "bob@example.com" },
];

const randomPlan = {
  teams: [
    { index: 1, members: [students[0]] },
    { index: 2, members: [students[1]] },
  ],
  unassignedStudents: [],
};

describe("service.random", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repo.findStaffScopedProject.mockResolvedValue(project);
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValue(students);
    mocks.repo.findProjectTeamSummaries.mockResolvedValue([{ id: 7, teamName: "Blue", memberCount: 2 }]);
    mocks.shared.normalizeTeamSizeConstraints.mockImplementation((input: any) => input ?? {});
    mocks.shared.buildConstrainedRandomPlan.mockReturnValue(randomPlan);
    mocks.repo.applyRandomAllocationPlan.mockResolvedValue([
      { id: 1, teamName: "Random Team 1", memberCount: 1 },
      { id: 2, teamName: "Random Team 2", memberCount: 1 },
    ]);
  });

  it.each([0, -1, 1.5])("rejects invalid preview teamCount %p", async (teamCount) => {
    await expect(previewRandomAllocationForProject(1, 2, teamCount as number)).rejects.toMatchObject({
      code: "INVALID_TEAM_COUNT",
    });
  });

  it("rejects preview for missing project", async () => {
    mocks.repo.findStaffScopedProject.mockResolvedValue(null);
    await expect(previewRandomAllocationForProject(1, 2, 2)).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
  });

  it("rejects preview when no students are vacant", async () => {
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValue([]);
    await expect(previewRandomAllocationForProject(1, 2, 2)).rejects.toEqual({ code: "NO_VACANT_STUDENTS" });
  });

  it("rejects preview when team count exceeds student count", async () => {
    await expect(previewRandomAllocationForProject(1, 2, 3)).rejects.toEqual({ code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" });
  });

  it("returns preview payload with suggested team names", async () => {
    const preview = await previewRandomAllocationForProject(1, 2, 2, { minTeamSize: 1 });
    expect(preview.teamCount).toBe(2);
    expect(preview.previewTeams[0]).toEqual(expect.objectContaining({ suggestedName: "Random Team 1" }));
    expect(mocks.shared.normalizeTeamSizeConstraints).toHaveBeenCalledWith({ minTeamSize: 1 });
  });

  it("rejects invalid apply teamCount", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_TEAM_COUNT" });
  });

  it("rejects mismatched, empty, and duplicate apply team names", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 2, { teamNames: ["A"] })).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
    await expect(applyRandomAllocationForProject(1, 2, 2, { teamNames: ["A", " "] })).rejects.toEqual({
      code: "INVALID_TEAM_NAMES",
    });
    await expect(applyRandomAllocationForProject(1, 2, 2, { teamNames: ["A", "a"] })).rejects.toEqual({
      code: "DUPLICATE_TEAM_NAMES",
    });
  });

  it("rejects apply for missing project or vacant students", async () => {
    mocks.repo.findStaffScopedProject.mockResolvedValueOnce(null);
    await expect(applyRandomAllocationForProject(1, 2, 2)).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });

    mocks.repo.findStaffScopedProject.mockResolvedValue(project);
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValueOnce([]);
    await expect(applyRandomAllocationForProject(1, 2, 2)).rejects.toEqual({ code: "NO_VACANT_STUDENTS" });
  });

  it("rejects apply when team count exceeds student count", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 3)).rejects.toEqual({ code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" });
  });

  it("applies random allocation with generated team names", async () => {
    const result = await applyRandomAllocationForProject(5, 2, 2);
    expect(result).toEqual(expect.objectContaining({ teamCount: 2, studentCount: 2 }));
    expect(mocks.repo.applyRandomAllocationPlan).toHaveBeenCalledWith(
      2,
      "ent-1",
      randomPlan.teams,
      expect.objectContaining({ teamNames: ["Random Team 1", "Random Team 2"], draftCreatedById: 5 }),
    );
  });

  it("applies random allocation with explicit team names and constraints", async () => {
    await applyRandomAllocationForProject(5, 2, 2, { teamNames: ["Blue", "Green"], minTeamSize: 1, maxTeamSize: 2 });
    expect(mocks.shared.normalizeTeamSizeConstraints).toHaveBeenCalledWith({ minTeamSize: 1, maxTeamSize: 2 });
    expect(mocks.repo.applyRandomAllocationPlan).toHaveBeenCalledWith(
      2,
      "ent-1",
      randomPlan.teams,
      expect.objectContaining({ teamNames: ["Blue", "Green"] }),
    );
  });
});