import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptTeamInvite,
  addUserToTeam,
  applyRandomAllocationForProject,
  cancelTeamInvite,
  createTeam,
  createTeamInvite,
  declineTeamInvite,
  expireTeamInvite,
  getTeamById,
  getTeamMembers,
  listTeamInvites,
  previewRandomAllocationForProject,
  rejectTeamInvite,
} from "./service.js";
import * as repo from "./repo.js";
import { sendEmail } from "../../shared/email.js";
import { prisma } from "../../shared/db.js";

vi.mock("./repo.js", () => ({
  applyRandomAllocationPlan: vi.fn(),
  createTeamInviteRecord: vi.fn(),
  findActiveInvite: vi.fn(),
  findInviteContext: vi.fn(),
  findVacantModuleStudentsForProject: vi.fn(),
  findProjectTeamSummaries: vi.fn(),
  findStaffScopedProject: vi.fn(),
  getInvitesForTeam: vi.fn(),
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

vi.mock("../../shared/db.js", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("teamAllocation service", () => {
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
      team: { teamName: "Team Alpha" },
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
    expect(result).toEqual(
      expect.objectContaining({
        invite: { id: "inv-1" },
        rawToken: expect.any(String),
      })
    );
    expect(result.rawToken).toHaveLength(64);
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
    (repo.updateInviteStatusFromPending as any).mockResolvedValue({ id: "i1", status: "ACCEPTED" });
    await expect(acceptTeamInvite("i1")).resolves.toEqual({ id: "i1", status: "ACCEPTED" });
    expect(repo.updateInviteStatusFromPending).toHaveBeenCalledWith("i1", "ACCEPTED", expect.any(Date));

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

    await expect(acceptTeamInvite("missing")).rejects.toEqual({ code: "INVITE_NOT_PENDING" });
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

    const preview = await previewRandomAllocationForProject(3, 42, 2, { seed: 123 });

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
      { id: 8, teamName: "Project 42 Random Team 1", memberCount: 2 },
      { id: 9, teamName: "Project 42 Random Team 2", memberCount: 2 },
    ]);

    const result = await applyRandomAllocationForProject(3, 42, 2, { seed: 999 });

    expect(repo.findVacantModuleStudentsForProject).toHaveBeenCalledWith("ent-9", 11, 42);
    expect(repo.applyRandomAllocationPlan).toHaveBeenCalledWith(42, "ent-9", expect.any(Array));
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
        { id: 8, teamName: "Project 42 Random Team 1", memberCount: 2 },
        { id: 9, teamName: "Project 42 Random Team 2", memberCount: 2 },
      ],
    });
    expect(sendEmail).toHaveBeenCalledTimes(4);
    const recipients = (sendEmail as any).mock.calls.map((call: any[]) => call[0]?.to).sort();
    expect(recipients).toEqual(["a@example.com", "b@example.com", "c@example.com", "d@example.com"]);
    expect((sendEmail as any).mock.calls[0][0]?.subject).toBe("Team allocation updated - Project A");
  });

  it("applyRandomAllocationForProject does not fail when notification email sending fails", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
      { id: 8, teamName: "Project 42 Random Team 1", memberCount: 1 },
      { id: 9, teamName: "Project 42 Random Team 2", memberCount: 1 },
    ]);
    (sendEmail as any).mockRejectedValueOnce(new Error("smtp"));
    (sendEmail as any).mockResolvedValueOnce({ suppressed: false });

    await expect(applyRandomAllocationForProject(3, 42, 2, { seed: 999 })).resolves.toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      studentCount: 2,
      teamCount: 2,
      appliedTeams: [
        { id: 8, teamName: "Project 42 Random Team 1", memberCount: 1 },
        { id: 9, teamName: "Project 42 Random Team 2", memberCount: 1 },
      ],
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });
});