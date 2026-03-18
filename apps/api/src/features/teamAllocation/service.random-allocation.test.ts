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

describe("teamAllocation service random allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.team.findUnique as any).mockResolvedValue(null);
  });
  it("previewRandomAllocationForProject validates team count", async () => {
    await expect(previewRandomAllocationForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_TEAM_COUNT" });
  });

  it("previewRandomAllocationForProject enforces staff project scope and archived guard", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(previewRandomAllocationForProject(3, 9, 2)).rejects.toEqual({
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
    await expect(previewRandomAllocationForProject(3, 9, 2)).rejects.toEqual({
      code: "PROJECT_ARCHIVED",
    });
  });

  it("previewRandomAllocationForProject validates available students", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 9,
      name: "Project",
      moduleId: 2,
      moduleName: "Module",
      archivedAt: null,
      enterpriseId: "ent-1",
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValueOnce([]);
    await expect(previewRandomAllocationForProject(3, 9, 2)).rejects.toEqual({
      code: "NO_VACANT_STUDENTS",
    });

    (repo.findVacantModuleStudentsForProject as any).mockResolvedValueOnce([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
    ]);
    await expect(previewRandomAllocationForProject(3, 9, 3)).rejects.toEqual({
      code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT",
    });
  });

  it("previewRandomAllocationForProject returns random preview payload", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
      { id: 3, firstName: "C", lastName: "C", email: "c@example.com" },
      { id: 4, firstName: "D", lastName: "D", email: "d@example.com" },
      { id: 5, firstName: "E", lastName: "E", email: "e@example.com" },
    ]);
    (repo.findProjectTeamSummaries as any).mockResolvedValue([
      { id: 7, teamName: "Team Alpha", memberCount: 3 },
    ]);

    const preview = await previewRandomAllocationForProject(3, 42, 2);

    expect(repo.findVacantModuleStudentsForProject).toHaveBeenCalledWith("ent-9", 11, 42);
    expect(preview.project).toEqual({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
    });
    expect(preview.teamCount).toBe(2);
    expect(preview.studentCount).toBe(5);
    expect(preview.existingTeams).toEqual([{ id: 7, teamName: "Team Alpha", memberCount: 3 }]);
    expect(preview.previewTeams).toHaveLength(2);
    expect(preview.previewTeams.map((team) => team.members.length).sort((a, b) => a - b)).toEqual([2, 3]);
    expect(preview.previewTeams.flatMap((team) => team.members).map((student) => student.id).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("applyRandomAllocationForProject validates team count", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_TEAM_COUNT" });
  });

  it("applyRandomAllocationForProject validates provided team names", async () => {
    await expect(
      applyRandomAllocationForProject(1, 2, 2, {
        teamNames: ["Team A"],
      }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });

    await expect(
      applyRandomAllocationForProject(1, 2, 2, {
        teamNames: ["Team A", " "],
      }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });

    await expect(
      applyRandomAllocationForProject(1, 2, 2, {
        teamNames: ["Team A", "team a"],
      }),
    ).rejects.toEqual({ code: "DUPLICATE_TEAM_NAMES" });
  });

  it("applyRandomAllocationForProject applies planned teams and returns summary", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
      { id: 3, firstName: "C", lastName: "C", email: "c@example.com" },
      { id: 4, firstName: "D", lastName: "D", email: "d@example.com" },
    ]);
    (repo.applyRandomAllocationPlan as any).mockResolvedValue([
      { id: 8, teamName: "Random Team 1", memberCount: 2 },
      { id: 9, teamName: "Random Team 2", memberCount: 2 },
    ]);

    const result = await applyRandomAllocationForProject(3, 42, 2);

    expect(repo.findVacantModuleStudentsForProject).toHaveBeenCalledWith("ent-9", 11, 42);
    expect(repo.applyRandomAllocationPlan).toHaveBeenCalledWith(42, "ent-9", expect.any(Array), {
      teamNames: ["Random Team 1", "Random Team 2"],
      draftCreatedById: 3,
    });
    const planned = (repo.applyRandomAllocationPlan as any).mock.calls[0][2];
    expect(planned).toHaveLength(2);
    expect(planned.flatMap((team: any) => team.members).map((student: any) => student.id).sort((a: number, b: number) => a - b)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(result).toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      studentCount: 4,
      teamCount: 2,
      appliedTeams: [
        { id: 8, teamName: "Random Team 1", memberCount: 2 },
        { id: 9, teamName: "Random Team 2", memberCount: 2 },
      ],
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("applyRandomAllocationForProject does not send notification emails for drafts", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
    ]);
    (repo.applyRandomAllocationPlan as any).mockResolvedValue([
      { id: 8, teamName: "Random Team 1", memberCount: 1 },
      { id: 9, teamName: "Random Team 2", memberCount: 1 },
    ]);

    await expect(applyRandomAllocationForProject(3, 42, 2)).resolves.toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      studentCount: 2,
      teamCount: 2,
      appliedTeams: [
        { id: 8, teamName: "Random Team 1", memberCount: 1 },
        { id: 9, teamName: "Random Team 2", memberCount: 1 },
      ],
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("applyRandomAllocationForProject surfaces stale preview conflicts", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
    ]);
    (repo.applyRandomAllocationPlan as any).mockRejectedValue({ code: "STUDENTS_NO_LONGER_VACANT" });

    await expect(applyRandomAllocationForProject(3, 42, 2)).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_VACANT",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("applyRandomAllocationForProject passes custom team names to repo", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
    ]);
    (repo.applyRandomAllocationPlan as any).mockResolvedValue([
      { id: 8, teamName: "Team Orion", memberCount: 1 },
      { id: 9, teamName: "Team Vega", memberCount: 1 },
    ]);

    await applyRandomAllocationForProject(3, 42, 2, {
      teamNames: ["Team Orion", "Team Vega"],
    });

    expect(repo.applyRandomAllocationPlan).toHaveBeenCalledWith(42, "ent-9", expect.any(Array), {
      teamNames: ["Team Orion", "Team Vega"],
      draftCreatedById: 3,
    });
  });
});