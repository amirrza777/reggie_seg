import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptTeamInvite,
  addUserToTeam,
  applyManualAllocationForProject,
  applyRandomAllocationForProject,
  cancelTeamInvite,
  createTeam,
  createTeamInvite,
  declineTeamInvite,
  expireTeamInvite,
  getManualAllocationWorkspaceForProject,
  getTeamById,
  getTeamMembers,
  listTeamInvites,
  previewRandomAllocationForProject,
  rejectTeamInvite,
} from "./service.js";
import * as repo from "./repo.js";
import { sendEmail } from "../../shared/email.js";
import { addNotification } from "../notifications/service.js";
import { prisma } from "../../shared/db.js";

vi.mock("./repo.js", () => ({
  approveDraftTeam: vi.fn(),
  applyManualAllocationTeam: vi.fn(),
  applyRandomAllocationPlan: vi.fn(),
  createTeamInviteRecord: vi.fn(),
  findDraftTeamById: vi.fn(),
  findDraftTeamInProject: vi.fn(),
  findCustomAllocationQuestionnairesForStaff: vi.fn(),
  findCustomAllocationTemplateForStaff: vi.fn(),
  findActiveInvite: vi.fn(),
  findInviteContext: vi.fn(),
  findLatestCustomAllocationResponsesForStudents: vi.fn(),
  findModuleStudentsByIdsInModule: vi.fn(),
  findModuleStudentsForManualAllocation: vi.fn(),
  findProjectDraftTeams: vi.fn(),
  findVacantModuleStudentsForProject: vi.fn(),
  findProjectTeamSummaries: vi.fn(),
  findRespondingStudentIdsForTemplateInProject: vi.fn(),
  findStaffScopedProjectAccess: vi.fn(),
  findStaffScopedProject: vi.fn(),
  findStudentAllocationConflictsInProject: vi.fn(),
  findTeamNameConflictInEnterprise: vi.fn(),
  getInvitesForTeam: vi.fn(),
  updateDraftTeam: vi.fn(),
  updateInviteStatusFromPending: vi.fn(),
  TeamService: {
    createTeam: vi.fn(),
    getTeamById: vi.fn(),
    addUserToTeam: vi.fn(),
    getTeamMembers: vi.fn(),
  },
}));

vi.mock("../../shared/email.js", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../shared/db.js", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("teamAllocation service manual allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.team.findUnique as any).mockResolvedValue(null);
  });
  it("getManualAllocationWorkspaceForProject enforces staff scope and archived guard", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(getManualAllocationWorkspaceForProject(3, 9)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce({
      id: 9,
      name: "Project",
      moduleId: 2,
      moduleName: "Module",
      archivedAt: new Date(),
      enterpriseId: "ent-1",
    });
    await expect(getManualAllocationWorkspaceForProject(3, 9)).rejects.toEqual({
      code: "PROJECT_ARCHIVED",
    });
  });

  it("getManualAllocationWorkspaceForProject returns students with statuses and counts", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findModuleStudentsForManualAllocation as any).mockResolvedValue([
      {
        id: 1,
        firstName: "A",
        lastName: "A",
        email: "a@example.com",
        currentTeamId: 91,
        currentTeamName: "Team Alpha",
      },
      {
        id: 2,
        firstName: "B",
        lastName: "B",
        email: "b@example.com",
        currentTeamId: null,
        currentTeamName: null,
      },
    ]);
    (repo.findProjectTeamSummaries as any).mockResolvedValue([
      { id: 91, teamName: "Team Alpha", memberCount: 4 },
    ]);

    const result = await getManualAllocationWorkspaceForProject(3, 42);

    expect(repo.findModuleStudentsForManualAllocation).toHaveBeenCalledWith("ent-9", 11, 42);
    expect(repo.findProjectTeamSummaries).toHaveBeenCalledWith(42);
    expect(result.project).toEqual({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
    });
    expect(result.students).toEqual([
      {
        id: 1,
        firstName: "A",
        lastName: "A",
        email: "a@example.com",
        status: "ALREADY_IN_TEAM",
        currentTeam: { id: 91, teamName: "Team Alpha" },
      },
      {
        id: 2,
        firstName: "B",
        lastName: "B",
        email: "b@example.com",
        status: "AVAILABLE",
        currentTeam: null,
      },
    ]);
    expect(result.counts).toEqual({
      totalStudents: 2,
      availableStudents: 1,
      alreadyInTeamStudents: 1,
    });
  });

  it("applyManualAllocationForProject validates team name and student ids", async () => {
    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "   ",
        studentIds: [1],
      })
    ).rejects.toEqual({ code: "INVALID_TEAM_NAME" });

    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [],
      })
    ).rejects.toEqual({ code: "INVALID_STUDENT_IDS" });

    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [1, 1],
      })
    ).rejects.toEqual({ code: "INVALID_STUDENT_IDS" });
  });

  it("applyManualAllocationForProject enforces staff scope and archived guard", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [1],
      })
    ).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: new Date(),
      enterpriseId: "ent-9",
    });
    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [1],
      })
    ).rejects.toEqual({ code: "PROJECT_ARCHIVED" });
  });

  it("applyManualAllocationForProject validates student module membership and availability", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findModuleStudentsForManualAllocation as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com", currentTeamId: null, currentTeamName: null },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com", currentTeamId: 77, currentTeamName: "Team Alpha" },
    ]);

    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [9],
      })
    ).rejects.toEqual({ code: "STUDENT_NOT_IN_MODULE" });

    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [2],
      })
    ).rejects.toEqual({ code: "STUDENT_ALREADY_ASSIGNED" });
  });

  it("applyManualAllocationForProject creates a draft team", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findModuleStudentsForManualAllocation as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com", currentTeamId: null, currentTeamName: null },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com", currentTeamId: null, currentTeamName: null },
    ]);
    (repo.applyManualAllocationTeam as any).mockResolvedValue({
      id: 90,
      teamName: "Team Gamma",
      memberCount: 2,
    });

    const result = await applyManualAllocationForProject(3, 42, {
      teamName: "Team Gamma",
      studentIds: [1, 2],
    });

    expect(repo.applyManualAllocationTeam).toHaveBeenCalledWith(42, "ent-9", "Team Gamma", [1, 2], {
      draftCreatedById: 3,
    });
    expect(result).toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      team: {
        id: 90,
        teamName: "Team Gamma",
        memberCount: 2,
      },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("applyManualAllocationForProject does not send notification emails for drafts", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findModuleStudentsForManualAllocation as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com", currentTeamId: null, currentTeamName: null },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com", currentTeamId: null, currentTeamName: null },
    ]);
    (repo.applyManualAllocationTeam as any).mockResolvedValue({
      id: 90,
      teamName: "Team Gamma",
      memberCount: 2,
    });

    await expect(
      applyManualAllocationForProject(3, 42, {
        teamName: "Team Gamma",
        studentIds: [1, 2],
      })
    ).resolves.toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      team: {
        id: 90,
        teamName: "Team Gamma",
        memberCount: 2,
      },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});