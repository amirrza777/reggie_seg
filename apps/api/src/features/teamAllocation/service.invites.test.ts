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

describe("teamAllocation service invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.team.findUnique as any).mockResolvedValue(null);
  });
  it("createTeamInvite throws when invite already pending", async () => {
    (repo.findActiveInvite as any).mockResolvedValue({ id: "existing" });

    await expect(
      createTeamInvite({
        teamId: 1,
        inviterId: 2,
        inviteeEmail: "user@example.com",
        baseUrl: "http://localhost:3001",
      })
    ).rejects.toEqual({ code: "INVITE_ALREADY_PENDING" });
  });

  it("createTeamInvite stores invite and sends email", async () => {
    (repo.findActiveInvite as any).mockResolvedValue(null);
    (repo.createTeamInviteRecord as any).mockResolvedValue({ id: "inv-1" });
    (repo.findInviteContext as any).mockResolvedValue({
      team: { teamName: "Team Alpha", projectId: 3 },
      inviter: { firstName: "Ava", lastName: "Smith", email: "ava@example.com" },
    });

    const result = await createTeamInvite({
      teamId: 1,
      inviterId: 2,
      inviteeEmail: "User@Example.com ",
      inviteeId: 7,
      message: "Join us",
      baseUrl: "http://localhost:3001",
    });

    expect(repo.findActiveInvite).toHaveBeenCalledWith(1, "user@example.com");
    expect(repo.createTeamInviteRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 1,
        inviterId: 2,
        inviteeId: 7,
        inviteeEmail: "user@example.com",
        message: "Join us",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Team invitation",
        text: expect.stringContaining("Team Alpha"),
      })
    );
    expect(addNotification).toHaveBeenCalledWith({
      userId: 7,
      type: "TEAM_INVITE",
      message: 'Ava Smith invited you to join "Team Alpha"',
      link: "/projects/3/team",
    });
    expect(result).toEqual(
      expect.objectContaining({
        invite: { id: "inv-1" },
        rawToken: expect.any(String),
      })
    );
    expect(result.rawToken).toHaveLength(64);
  });

  it("createTeamInvite resolves userId from email when inviteeId not provided", async () => {
    (repo.findActiveInvite as any).mockResolvedValue(null);
    (repo.createTeamInviteRecord as any).mockResolvedValue({ id: "inv-2" });
    (repo.findInviteContext as any).mockResolvedValue({
      team: { teamName: "Team Beta", projectId: 5 },
      inviter: { firstName: "Reggie", lastName: "Jones", email: "reggie@example.com" },
    });
    (prisma.user.findFirst as any).mockResolvedValue({ id: 42 });

    await createTeamInvite({
      teamId: 1,
      inviterId: 2,
      inviteeEmail: "newuser@example.com",
      baseUrl: "http://localhost:3001",
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: "newuser@example.com" },
      select: { id: true },
    });
    expect(addNotification).toHaveBeenCalledWith({
      userId: 42,
      type: "TEAM_INVITE",
      message: 'Reggie Jones invited you to join "Team Beta"',
      link: "/projects/5/team",
    });
  });

  it("delegates list/get/create/add/members to repo TeamService", async () => {
    (repo.getInvitesForTeam as any).mockResolvedValue([{ id: "i1" }]);
    (repo.TeamService.createTeam as any).mockResolvedValue({ id: 10 });
    (repo.TeamService.getTeamById as any).mockResolvedValue({ id: 10 });
    (repo.TeamService.addUserToTeam as any).mockResolvedValue({ teamId: 10, userId: 4 });
    (repo.TeamService.getTeamMembers as any).mockResolvedValue([{ id: 4 }]);

    await expect(listTeamInvites(10)).resolves.toEqual([{ id: "i1" }]);
    await expect(createTeam(1, { teamName: "T1", projectId: 2 })).resolves.toEqual({ id: 10 });
    await expect(getTeamById(10)).resolves.toEqual({ id: 10 });
    await expect(addUserToTeam(10, 4, "OWNER")).resolves.toEqual({ teamId: 10, userId: 4 });
    await expect(getTeamMembers(10)).resolves.toEqual([{ id: 4 }]);
  });

  it("accept/decline/reject/cancel/expire update invite status", async () => {
    (repo.updateInviteStatusFromPending as any).mockResolvedValue({ id: "i1", teamId: 10, status: "ACCEPTED" });
    await expect(acceptTeamInvite("i1", 5)).resolves.toEqual({ id: "i1", teamId: 10, status: "ACCEPTED" });
    expect(repo.updateInviteStatusFromPending).toHaveBeenCalledWith("i1", "ACCEPTED", expect.any(Date));
    expect(repo.TeamService.addUserToTeam).toHaveBeenCalledWith(10, 5);

    (repo.updateInviteStatusFromPending as any).mockResolvedValue({ id: "i1", status: "DECLINED" });
    await expect(declineTeamInvite("i1")).resolves.toEqual({ id: "i1", status: "DECLINED" });
    await expect(rejectTeamInvite("i1")).resolves.toEqual({ id: "i1", status: "DECLINED" });

    (repo.updateInviteStatusFromPending as any).mockResolvedValue({ id: "i1", status: "CANCELLED" });
    await expect(cancelTeamInvite("i1")).resolves.toEqual({ id: "i1", status: "CANCELLED" });

    (repo.updateInviteStatusFromPending as any).mockResolvedValue({ id: "i1", status: "EXPIRED" });
    await expect(expireTeamInvite("i1")).resolves.toEqual({ id: "i1", status: "EXPIRED" });
  });

  it("throws INVITE_NOT_PENDING when transition update returns null", async () => {
    (repo.updateInviteStatusFromPending as any).mockResolvedValue(null);

    await expect(acceptTeamInvite("missing", 5)).rejects.toEqual({ code: "INVITE_NOT_PENDING" });
  });
});