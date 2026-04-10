import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertProjectMutableForWrites: vi.fn(),
  repo: {
    applyRandomAllocationPlan: vi.fn(),
    findStaffScopedProject: vi.fn(),
    findVacantModuleStudentsForProject: vi.fn(),
  },
  shared: {
    deleteCustomAllocationPreview: vi.fn(),
    findStaleStudentsFromPreview: vi.fn(),
    getStoredCustomAllocationPreview: vi.fn(),
    resolveCustomAllocationTeamNames: vi.fn(),
  },
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWrites: mocks.assertProjectMutableForWrites,
}));

vi.mock("../repo/repo.js", () => ({
  applyRandomAllocationPlan: mocks.repo.applyRandomAllocationPlan,
  findStaffScopedProject: mocks.repo.findStaffScopedProject,
  findVacantModuleStudentsForProject: mocks.repo.findVacantModuleStudentsForProject,
}));

vi.mock("./service.custom-allocation.shared.js", () => ({
  deleteCustomAllocationPreview: mocks.shared.deleteCustomAllocationPreview,
  findStaleStudentsFromPreview: mocks.shared.findStaleStudentsFromPreview,
  getStoredCustomAllocationPreview: mocks.shared.getStoredCustomAllocationPreview,
  resolveCustomAllocationTeamNames: mocks.shared.resolveCustomAllocationTeamNames,
}));

import { applyCustomAllocationForProject } from "./service.custom-allocation.apply.js";

const project = { id: 9, name: "Project", moduleId: 3, moduleName: "Module", enterpriseId: "ent-1" };
const preview = {
  teamCount: 2,
  previewTeams: [
    {
      index: 0,
      members: [{ id: 1, firstName: "A", lastName: "B", email: "a@b.com", responseStatus: "RESPONDED" }],
    },
    {
      index: 1,
      members: [{ id: 2, firstName: "C", lastName: "D", email: "c@d.com", responseStatus: "NO_RESPONSE" }],
    },
  ],
};

describe("service.custom-allocation.apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repo.findStaffScopedProject.mockResolvedValue(project);
    mocks.shared.getStoredCustomAllocationPreview.mockReturnValue(preview);
    mocks.shared.resolveCustomAllocationTeamNames.mockReturnValue(["Team 1", "Team 2"]);
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mocks.shared.findStaleStudentsFromPreview.mockReturnValue([]);
    mocks.repo.applyRandomAllocationPlan.mockResolvedValue([
      { id: 70, teamName: "Team 1", memberCount: 1 },
      { id: 71, teamName: "Team 2", memberCount: 1 },
    ]);
  });

  it("rejects empty preview id", async () => {
    await expect(applyCustomAllocationForProject(1, 2, { previewId: "   " })).rejects.toEqual({
      code: "INVALID_PREVIEW_ID",
    });
  });

  it("rejects malformed team names payload", async () => {
    await expect(
      applyCustomAllocationForProject(1, 2, { previewId: "preview-1", teamNames: ["A", 12 as any] }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
  });

  it("rejects inaccessible projects and missing previews", async () => {
    mocks.repo.findStaffScopedProject.mockResolvedValueOnce(null);
    await expect(applyCustomAllocationForProject(1, 9, { previewId: "p-1" })).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
    mocks.shared.getStoredCustomAllocationPreview.mockReturnValueOnce(null);
    await expect(applyCustomAllocationForProject(1, 9, { previewId: "p-1" })).rejects.toEqual({
      code: "PREVIEW_NOT_FOUND_OR_EXPIRED",
    });
  });

  it("invalidates preview when stale students are detected before apply", async () => {
    mocks.shared.findStaleStudentsFromPreview.mockReturnValueOnce([{ id: 3 }]);
    await expect(applyCustomAllocationForProject(7, 9, { previewId: "p-1" })).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [{ id: 3 }],
    });
    expect(mocks.shared.deleteCustomAllocationPreview).toHaveBeenCalledWith("p-1");
    expect(mocks.repo.applyRandomAllocationPlan).not.toHaveBeenCalled();
  });

  it("recomputes stale students when apply fails with vacancy conflict", async () => {
    mocks.repo.applyRandomAllocationPlan.mockRejectedValueOnce({ code: "STUDENTS_NO_LONGER_VACANT" });
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
    mocks.shared.findStaleStudentsFromPreview.mockReturnValueOnce([]).mockReturnValueOnce([{ id: 2 }]);
    await expect(applyCustomAllocationForProject(7, 9, { previewId: "p-1" })).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [{ id: 2 }],
    });
    expect(mocks.shared.deleteCustomAllocationPreview).toHaveBeenCalledWith("p-1");
  });

  it("propagates non-vacancy apply errors", async () => {
    mocks.repo.applyRandomAllocationPlan.mockRejectedValueOnce(new Error("boom"));
    await expect(applyCustomAllocationForProject(7, 9, { previewId: "p-1" })).rejects.toThrow("boom");
    expect(mocks.shared.deleteCustomAllocationPreview).not.toHaveBeenCalled();
  });

  it("applies preview teams and returns summary payload", async () => {
    const result = await applyCustomAllocationForProject(7, 9, { previewId: "p-1", teamNames: ["A", "B"] });
    expect(result).toEqual({
      project: { id: 9, name: "Project", moduleId: 3, moduleName: "Module" },
      previewId: "p-1",
      studentCount: 2,
      teamCount: 2,
      appliedTeams: [
        { id: 70, teamName: "Team 1", memberCount: 1 },
        { id: 71, teamName: "Team 2", memberCount: 1 },
      ],
    });
  });
});