import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listAllocationDraftsForProject,
  updateAllocationDraftForProject,
} from "./service.js";
import * as repo from "./repo.js";
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
  findPendingInvitesForEmail: vi.fn(),
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

describe("teamAllocation service allocation drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.team.findUnique as any).mockResolvedValue(null);
  });

  it("listAllocationDraftsForProject enforces scope and archived guard", async () => {
    (repo.findStaffScopedProjectAccess as any).mockResolvedValueOnce(null);
    await expect(listAllocationDraftsForProject(7, 42)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });

    (repo.findStaffScopedProjectAccess as any).mockResolvedValueOnce({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: new Date(),
      enterpriseId: "ent-9",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });

    await expect(listAllocationDraftsForProject(7, 42)).rejects.toEqual({
      code: "PROJECT_ARCHIVED",
    });
  });

  it("listAllocationDraftsForProject returns mapped draft payload", async () => {
    (repo.findStaffScopedProjectAccess as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });
    (repo.findProjectDraftTeams as any).mockResolvedValue([
      {
        id: 301,
        teamName: "Draft Team 1",
        memberCount: 2,
        createdAt: new Date("2026-03-17T10:00:00.000Z"),
        updatedAt: new Date("2026-03-17T10:05:00.000Z"),
        draftCreatedBy: {
          id: 5,
          firstName: "Owner",
          lastName: "One",
          email: "owner@example.com",
        },
        members: [
          {
            id: 81,
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          },
        ],
      },
    ]);

    const result = await listAllocationDraftsForProject(7, 42);

    expect(repo.findProjectDraftTeams).toHaveBeenCalledWith(42);
    expect(result.access).toEqual({
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });
    expect(result.drafts[0]).toEqual(
      expect.objectContaining({
        id: 301,
        teamName: "Draft Team 1",
        createdAt: "2026-03-17T10:00:00.000Z",
        updatedAt: "2026-03-17T10:05:00.000Z",
      }),
    );
  });

  it("updateAllocationDraftForProject validates payload shape", async () => {
    await expect(
      updateAllocationDraftForProject(7, 42, 0, { teamName: "Team A" }),
    ).rejects.toEqual({ code: "INVALID_DRAFT_TEAM_ID" });

    await expect(updateAllocationDraftForProject(7, 42, 9, {})).rejects.toEqual({
      code: "INVALID_DRAFT_UPDATE",
    });

    await expect(
      updateAllocationDraftForProject(7, 42, 9, { teamName: "  " }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAME" });

    await expect(
      updateAllocationDraftForProject(7, 42, 9, { studentIds: [1, 1] }),
    ).rejects.toEqual({ code: "INVALID_STUDENT_IDS" });
  });

  it("updateAllocationDraftForProject enforces scope and archived guard", async () => {
    (repo.findStaffScopedProjectAccess as any).mockResolvedValueOnce(null);

    await expect(
      updateAllocationDraftForProject(7, 42, 9, { teamName: "Team A" }),
    ).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });

    (repo.findStaffScopedProjectAccess as any).mockResolvedValueOnce({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: new Date(),
      enterpriseId: "ent-9",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });

    await expect(
      updateAllocationDraftForProject(7, 42, 9, { teamName: "Team A" }),
    ).rejects.toEqual({ code: "PROJECT_ARCHIVED" });
  });

  it("updateAllocationDraftForProject validates draft existence and team name conflicts", async () => {
    (repo.findStaffScopedProjectAccess as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });

    (repo.findDraftTeamInProject as any).mockResolvedValueOnce(null);
    await expect(
      updateAllocationDraftForProject(7, 42, 9, { teamName: "Team A" }),
    ).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });

    (repo.findDraftTeamInProject as any).mockResolvedValueOnce({
      id: 9,
      teamName: "Draft A",
      projectId: 42,
      enterpriseId: "ent-9",
    });
    (repo.findTeamNameConflictInEnterprise as any).mockResolvedValueOnce(true);

    await expect(
      updateAllocationDraftForProject(7, 42, 9, { teamName: "Taken Name" }),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });
  });

  it("updateAllocationDraftForProject validates student membership and conflicts", async () => {
    (repo.findStaffScopedProjectAccess as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });
    (repo.findDraftTeamInProject as any).mockResolvedValue({
      id: 9,
      teamName: "Draft A",
      projectId: 42,
      enterpriseId: "ent-9",
    });

    (repo.findModuleStudentsByIdsInModule as any).mockResolvedValueOnce([{ id: 1 }]);
    await expect(
      updateAllocationDraftForProject(7, 42, 9, { studentIds: [1, 2] }),
    ).rejects.toEqual({ code: "STUDENT_NOT_IN_MODULE" });

    (repo.findModuleStudentsByIdsInModule as any).mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    (repo.findStudentAllocationConflictsInProject as any).mockResolvedValueOnce([
      {
        userId: 2,
        firstName: "B",
        lastName: "B",
        email: "b@example.com",
        teamId: 501,
        teamName: "Active Team",
      },
    ]);
    await expect(
      updateAllocationDraftForProject(7, 42, 9, { studentIds: [1, 2] }),
    ).rejects.toMatchObject({ code: "STUDENT_ALREADY_ASSIGNED" });

    (repo.findModuleStudentsByIdsInModule as any).mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    (repo.findStudentAllocationConflictsInProject as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          userId: 2,
          firstName: "B",
          lastName: "B",
          email: "b@example.com",
          teamId: 502,
          teamName: "Draft Team",
        },
      ]);
    await expect(
      updateAllocationDraftForProject(7, 42, 9, { studentIds: [1, 2] }),
    ).rejects.toMatchObject({ code: "STUDENT_IN_OTHER_DRAFT" });
  });

  it("updateAllocationDraftForProject updates and returns refreshed draft", async () => {
    (repo.findStaffScopedProjectAccess as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
      actorRole: "STAFF",
      isModuleLead: false,
      isModuleTeachingAssistant: true,
      canApproveAllocationDrafts: false,
    });
    (repo.findDraftTeamInProject as any).mockResolvedValue({
      id: 9,
      teamName: "Draft A",
      projectId: 42,
      enterpriseId: "ent-9",
    });
    (repo.findTeamNameConflictInEnterprise as any).mockResolvedValue(false);
    (repo.findModuleStudentsByIdsInModule as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    (repo.findStudentAllocationConflictsInProject as any).mockResolvedValue([]);
    (repo.updateDraftTeam as any).mockResolvedValue({
      id: 9,
      teamName: "Draft Updated",
      memberCount: 2,
    });
    (repo.findDraftTeamById as any).mockResolvedValue({
      id: 9,
      teamName: "Draft Updated",
      memberCount: 2,
      createdAt: new Date("2026-03-17T10:00:00.000Z"),
      updatedAt: new Date("2026-03-17T10:12:00.000Z"),
      draftCreatedBy: {
        id: 5,
        firstName: "Owner",
        lastName: "One",
        email: "owner@example.com",
      },
      members: [
        {
          id: 1,
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
        },
        {
          id: 2,
          firstName: "Linus",
          lastName: "Torvalds",
          email: "linus@example.com",
        },
      ],
    });

    const result = await updateAllocationDraftForProject(7, 42, 9, {
      teamName: " Draft Updated ",
      studentIds: [1, 2],
    });

    expect(repo.findTeamNameConflictInEnterprise).toHaveBeenCalledWith("ent-9", "Draft Updated", {
      excludeTeamId: 9,
    });
    expect(repo.findStudentAllocationConflictsInProject).toHaveBeenNthCalledWith(1, 42, [1, 2], "ACTIVE", {
      excludeTeamId: 9,
    });
    expect(repo.findStudentAllocationConflictsInProject).toHaveBeenNthCalledWith(2, 42, [1, 2], "DRAFT", {
      excludeTeamId: 9,
    });
    expect(repo.updateDraftTeam).toHaveBeenCalledWith(9, {
      teamName: "Draft Updated",
      studentIds: [1, 2],
    });

    expect(result).toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      access: {
        actorRole: "STAFF",
        isModuleLead: false,
        isModuleTeachingAssistant: true,
        canApproveAllocationDrafts: false,
      },
      draft: {
        id: 9,
        teamName: "Draft Updated",
        memberCount: 2,
        createdAt: "2026-03-17T10:00:00.000Z",
        updatedAt: "2026-03-17T10:12:00.000Z",
        draftCreatedBy: {
          id: 5,
          firstName: "Owner",
          lastName: "One",
          email: "owner@example.com",
        },
        members: [
          {
            id: 1,
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          },
          {
            id: 2,
            firstName: "Linus",
            lastName: "Torvalds",
            email: "linus@example.com",
          },
        ],
      },
    });
  });
});
