import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertProjectMutableForWrites: vi.fn(),
  findStaffScopedProjectAccess: vi.fn(),
  findProjectDraftTeams: vi.fn(),
  findDraftTeamInProject: vi.fn(),
  findDraftTeamById: vi.fn(),
  findTeamNameConflictInEnterprise: vi.fn(),
  findModuleStudentsByIdsInModule: vi.fn(),
  findStudentAllocationConflictsInProject: vi.fn(),
  updateDraftTeam: vi.fn(),
  approveDraftTeam: vi.fn(),
  deleteDraftTeam: vi.fn(),
  mapAllocationDraftTeamForResponse: vi.fn(),
  notifyStudentsAboutApprovedDraftTeam: vi.fn(),
  parseExpectedUpdatedAt: vi.fn(),
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWrites: mocks.assertProjectMutableForWrites,
}));

vi.mock("../repo/repo.js", () => ({
  findStaffScopedProjectAccess: mocks.findStaffScopedProjectAccess,
  findProjectDraftTeams: mocks.findProjectDraftTeams,
  findDraftTeamInProject: mocks.findDraftTeamInProject,
  findDraftTeamById: mocks.findDraftTeamById,
  findTeamNameConflictInEnterprise: mocks.findTeamNameConflictInEnterprise,
  findModuleStudentsByIdsInModule: mocks.findModuleStudentsByIdsInModule,
  findStudentAllocationConflictsInProject: mocks.findStudentAllocationConflictsInProject,
  updateDraftTeam: mocks.updateDraftTeam,
  approveDraftTeam: mocks.approveDraftTeam,
  deleteDraftTeam: mocks.deleteDraftTeam,
}));

vi.mock("./service.drafts.helpers.js", () => ({
  mapAllocationDraftTeamForResponse: mocks.mapAllocationDraftTeamForResponse,
  notifyStudentsAboutApprovedDraftTeam: mocks.notifyStudentsAboutApprovedDraftTeam,
  parseExpectedUpdatedAt: mocks.parseExpectedUpdatedAt,
}));

import {
  approveAllocationDraftForProject,
  deleteAllocationDraftForProject,
  listAllocationDraftsForProject,
  updateAllocationDraftForProject,
} from "./service.drafts.js";

const baseProject = {
  id: 9,
  name: "Project",
  moduleId: 3,
  moduleName: "Module",
  enterpriseId: "ent-1",
  actorRole: "STAFF",
  isModuleLead: true,
  isModuleTeachingAssistant: false,
  canApproveAllocationDrafts: true,
};

const baseDraft = {
  id: 7,
  teamName: "Blue",
  memberCount: 2,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  draftCreatedBy: { id: 12 },
  members: [{ id: 21, firstName: "Ada", email: "ada@example.com" }],
};

describe("service allocation drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findStaffScopedProjectAccess.mockResolvedValue(baseProject);
    mocks.findProjectDraftTeams.mockResolvedValue([baseDraft]);
    mocks.findDraftTeamInProject.mockResolvedValue({ id: 7 });
    mocks.findDraftTeamById.mockResolvedValue(baseDraft);
    mocks.findTeamNameConflictInEnterprise.mockResolvedValue(false);
    mocks.findModuleStudentsByIdsInModule.mockResolvedValue([{ id: 21 }, { id: 22 }]);
    mocks.findStudentAllocationConflictsInProject.mockResolvedValue([]);
    mocks.updateDraftTeam.mockResolvedValue({ id: 7, teamName: "Blue", memberCount: 2 });
    mocks.approveDraftTeam.mockResolvedValue({
      id: 7,
      teamName: "Blue",
      memberCount: 1,
      members: [{ firstName: "Ada", email: "ada@example.com" }],
    });
    mocks.deleteDraftTeam.mockResolvedValue({ id: 7, teamName: "Blue" });
    mocks.mapAllocationDraftTeamForResponse.mockImplementation((team: any) => ({ id: team.id, teamName: team.teamName }));
    mocks.parseExpectedUpdatedAt.mockImplementation((raw: unknown) => (raw ? new Date(String(raw)) : undefined));
    mocks.notifyStudentsAboutApprovedDraftTeam.mockResolvedValue(undefined);
  });

  it("listAllocationDraftsForProject rejects inaccessible projects", async () => {
    mocks.findStaffScopedProjectAccess.mockResolvedValue(null);
    await expect(listAllocationDraftsForProject(1, 9)).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
  });

  it("listAllocationDraftsForProject maps project access and drafts", async () => {
    const workspace = await listAllocationDraftsForProject(1, 9);
    expect(workspace.project).toEqual({ id: 9, name: "Project", moduleId: 3, moduleName: "Module" });
    expect(workspace.drafts).toEqual([{ id: 7, teamName: "Blue" }]);
    expect(mocks.assertProjectMutableForWrites).toHaveBeenCalledWith(baseProject);
  });

  it("updateAllocationDraftForProject rejects invalid draft id", async () => {
    await expect(updateAllocationDraftForProject(1, 9, 0, { teamName: "Blue" })).rejects.toEqual({
      code: "INVALID_DRAFT_TEAM_ID",
    });
  });

  it("updateAllocationDraftForProject rejects empty updates", async () => {
    await expect(updateAllocationDraftForProject(1, 9, 7, {})).rejects.toEqual({ code: "INVALID_DRAFT_UPDATE" });
  });

  it("updateAllocationDraftForProject rejects invalid teamName", async () => {
    await expect(updateAllocationDraftForProject(1, 9, 7, { teamName: " " })).rejects.toEqual({ code: "INVALID_TEAM_NAME" });
  });

  it("updateAllocationDraftForProject rejects duplicate student ids", async () => {
    await expect(updateAllocationDraftForProject(1, 9, 7, { studentIds: [21, 21] })).rejects.toEqual({
      code: "INVALID_STUDENT_IDS",
    });
  });

  it("updateAllocationDraftForProject rejects missing draft inside project", async () => {
    mocks.findDraftTeamInProject.mockResolvedValue(null);
    await expect(updateAllocationDraftForProject(1, 9, 7, { teamName: "Blue" })).rejects.toEqual({
      code: "DRAFT_TEAM_NOT_FOUND",
    });
  });

  it("updateAllocationDraftForProject rejects stale expectedUpdatedAt", async () => {
    mocks.parseExpectedUpdatedAt.mockReturnValue(new Date("2026-01-03T00:00:00.000Z"));
    await expect(updateAllocationDraftForProject(1, 9, 7, { teamName: "Blue", expectedUpdatedAt: "x" })).rejects.toEqual(
      { code: "DRAFT_OUTDATED" },
    );
  });

  it("updateAllocationDraftForProject rejects duplicate team names", async () => {
    mocks.findTeamNameConflictInEnterprise.mockResolvedValue(true);
    await expect(updateAllocationDraftForProject(1, 9, 7, { teamName: "Blue" })).rejects.toEqual({
      code: "TEAM_NAME_ALREADY_EXISTS",
    });
  });

  it("updateAllocationDraftForProject rejects students outside module", async () => {
    mocks.findModuleStudentsByIdsInModule.mockResolvedValue([{ id: 21 }]);
    await expect(updateAllocationDraftForProject(1, 9, 7, { studentIds: [21, 22] })).rejects.toEqual({
      code: "STUDENT_NOT_IN_MODULE",
    });
  });

  it("updateAllocationDraftForProject rejects active allocation conflicts", async () => {
    mocks.findStudentAllocationConflictsInProject.mockResolvedValueOnce([{ userId: 21 }]);
    await expect(updateAllocationDraftForProject(1, 9, 7, { studentIds: [21, 22] })).rejects.toEqual({
      code: "STUDENT_ALREADY_ASSIGNED",
      conflicts: [{ userId: 21 }],
    });
  });

  it("updateAllocationDraftForProject rejects draft allocation conflicts", async () => {
    mocks.findStudentAllocationConflictsInProject.mockResolvedValueOnce([]);
    mocks.findStudentAllocationConflictsInProject.mockResolvedValueOnce([{ userId: 22 }]);
    await expect(updateAllocationDraftForProject(1, 9, 7, { studentIds: [21, 22] })).rejects.toEqual({
      code: "STUDENT_IN_OTHER_DRAFT",
      conflicts: [{ userId: 22 }],
    });
  });

  it("updateAllocationDraftForProject returns updated draft payload", async () => {
    const result = await updateAllocationDraftForProject(1, 9, 7, { teamName: "Blue", studentIds: [21, 22] });
    expect(result.draft).toEqual({ id: 7, teamName: "Blue" });
    expect(mocks.updateDraftTeam).toHaveBeenCalledWith(7, { teamName: "Blue", studentIds: [21, 22] });
  });

  it("approveAllocationDraftForProject rejects invalid draft id", async () => {
    await expect(approveAllocationDraftForProject(1, 9, 0)).rejects.toEqual({ code: "INVALID_DRAFT_TEAM_ID" });
  });

  it("approveAllocationDraftForProject rejects non-owner approvals", async () => {
    mocks.findStaffScopedProjectAccess.mockResolvedValue({ ...baseProject, canApproveAllocationDrafts: false });
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "APPROVAL_FORBIDDEN" });
  });

  it("approveAllocationDraftForProject rejects inaccessible projects", async () => {
    mocks.findStaffScopedProjectAccess.mockResolvedValue(null);
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("approveAllocationDraftForProject rejects missing drafts in project scope", async () => {
    mocks.findDraftTeamInProject.mockResolvedValue(null);
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("approveAllocationDraftForProject rejects drafts without members", async () => {
    mocks.findDraftTeamById.mockResolvedValue({ ...baseDraft, memberCount: 0, members: [] });
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_HAS_NO_MEMBERS" });
  });

  it("approveAllocationDraftForProject rejects missing draft rows before approval", async () => {
    mocks.findDraftTeamById.mockResolvedValue(null);
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("approveAllocationDraftForProject rejects stale expectedUpdatedAt values", async () => {
    mocks.parseExpectedUpdatedAt.mockReturnValue(new Date("2026-01-05T00:00:00.000Z"));
    await expect(
      approveAllocationDraftForProject(1, 9, 7, { expectedUpdatedAt: "2026-01-05T00:00:00.000Z" }),
    ).rejects.toEqual({ code: "DRAFT_OUTDATED" });
  });

  it("approveAllocationDraftForProject rejects active conflicts", async () => {
    mocks.findStudentAllocationConflictsInProject.mockResolvedValue([{ userId: 21 }]);
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_AVAILABLE",
      conflicts: [{ userId: 21 }],
    });
  });

  it("approveAllocationDraftForProject approves and notifies students", async () => {
    const result = await approveAllocationDraftForProject(1, 9, 7);
    expect(result.approvedTeam).toEqual({ id: 7, teamName: "Blue", memberCount: 1 });
    expect(mocks.notifyStudentsAboutApprovedDraftTeam).toHaveBeenCalled();
  });

  it("approveAllocationDraftForProject rejects missing approved rows after write", async () => {
    mocks.approveDraftTeam.mockResolvedValue(null);
    await expect(approveAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("deleteAllocationDraftForProject rejects invalid draft id", async () => {
    await expect(deleteAllocationDraftForProject(1, 9, 0)).rejects.toEqual({ code: "INVALID_DRAFT_TEAM_ID" });
  });

  it("deleteAllocationDraftForProject rejects inaccessible projects", async () => {
    mocks.findStaffScopedProjectAccess.mockResolvedValue(null);
    await expect(deleteAllocationDraftForProject(1, 9, 7)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("deleteAllocationDraftForProject rejects non-owner non-creator deletes", async () => {
    mocks.findStaffScopedProjectAccess.mockResolvedValue({ ...baseProject, canApproveAllocationDrafts: false });
    mocks.findDraftTeamById.mockResolvedValue({ ...baseDraft, draftCreatedBy: { id: 22 } });
    await expect(deleteAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DELETE_DRAFT_FORBIDDEN" });
  });

  it("deleteAllocationDraftForProject rejects stale expectedUpdatedAt values", async () => {
    mocks.parseExpectedUpdatedAt.mockReturnValue(new Date("2026-01-05T00:00:00.000Z"));
    await expect(
      deleteAllocationDraftForProject(1, 9, 7, { expectedUpdatedAt: "2026-01-05T00:00:00.000Z" }),
    ).rejects.toEqual({ code: "DRAFT_OUTDATED" });
  });

  it("deleteAllocationDraftForProject rejects when draft is missing from project", async () => {
    mocks.findDraftTeamInProject.mockResolvedValue(null);
    await expect(deleteAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("deleteAllocationDraftForProject rejects when draft row no longer exists", async () => {
    mocks.findDraftTeamById.mockResolvedValue(null);
    await expect(deleteAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("deleteAllocationDraftForProject throws when delete write returns null", async () => {
    mocks.deleteDraftTeam.mockResolvedValue(null);
    await expect(deleteAllocationDraftForProject(1, 9, 7)).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("deleteAllocationDraftForProject allows deletes for draft creator", async () => {
    mocks.findStaffScopedProjectAccess.mockResolvedValue({ ...baseProject, canApproveAllocationDrafts: false });
    mocks.findDraftTeamById.mockResolvedValue({ ...baseDraft, draftCreatedBy: { id: 1 } });
    const result = await deleteAllocationDraftForProject(1, 9, 7);
    expect(result).toEqual(expect.objectContaining({ deletedDraft: { id: 7, teamName: "Blue" } }));
  });
});
