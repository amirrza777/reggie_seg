import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  addNotification: vi.fn(),
  prisma: {
    team: { findUnique: vi.fn() },
    teamAllocation: { findUnique: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
  repo: {
    createTeamInviteRecord: vi.fn(),
    findActiveInvite: vi.fn(),
    findInviteEligibleStudentForTeamByEmail: vi.fn(),
    findInviteEligibleStudentsForTeam: vi.fn(),
    findInviteContext: vi.fn(),
    findPendingInvitesForEmail: vi.fn(),
    getInvitesForTeam: vi.fn(),
    updateInviteStatusFromPending: vi.fn(),
    addUserToTeam: vi.fn(),
  },
}));

vi.mock("../../../shared/email.js", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("../../notifications/service.js", () => ({ addNotification: mocks.addNotification }));
vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));
vi.mock("../repo/repo.js", () => ({
  createTeamInviteRecord: mocks.repo.createTeamInviteRecord,
  findActiveInvite: mocks.repo.findActiveInvite,
  findInviteEligibleStudentForTeamByEmail: mocks.repo.findInviteEligibleStudentForTeamByEmail,
  findInviteEligibleStudentsForTeam: mocks.repo.findInviteEligibleStudentsForTeam,
  findInviteContext: mocks.repo.findInviteContext,
  findPendingInvitesForEmail: mocks.repo.findPendingInvitesForEmail,
  getInvitesForTeam: mocks.repo.getInvitesForTeam,
  updateInviteStatusFromPending: mocks.repo.updateInviteStatusFromPending,
  TeamService: { addUserToTeam: mocks.repo.addUserToTeam },
}));

import {
  acceptTeamInvite,
  cancelTeamInvite,
  createTeamInvite,
  declineTeamInvite,
  expireTeamInvite,
  listInviteEligibleStudents,
  listReceivedInvites,
  listTeamInvites,
  rejectTeamInvite,
} from "./service.invites.js";

describe("service.invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.team.findUnique.mockResolvedValue({ archivedAt: null, allocationLifecycle: "ACTIVE" });
    mocks.prisma.teamAllocation.findUnique.mockResolvedValue({ teamId: 2 });
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 77 });
    mocks.prisma.user.findUnique.mockResolvedValue({ email: "invitee@example.com" });
    mocks.repo.findInviteEligibleStudentForTeamByEmail.mockResolvedValue({ id: 77 });
    mocks.repo.findActiveInvite.mockResolvedValue(null);
    mocks.repo.createTeamInviteRecord.mockResolvedValue({ id: "inv-1", teamId: 2 });
    mocks.repo.findInviteContext.mockResolvedValue({
      team: { teamName: "Blue", projectId: 9, project: { name: "Project" } },
      inviter: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
    });
    mocks.repo.getInvitesForTeam.mockResolvedValue([{ id: "inv-1" }]);
    mocks.repo.findPendingInvitesForEmail.mockResolvedValue([{ id: "inv-2" }]);
    mocks.repo.updateInviteStatusFromPending.mockResolvedValue({ id: "inv-1", teamId: 2, status: "ACCEPTED" });
    mocks.repo.findInviteEligibleStudentsForTeam.mockResolvedValue([{ id: 31 }]);
    mocks.repo.addUserToTeam.mockResolvedValue({ id: 2, userId: 77 });
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.addNotification.mockResolvedValue(undefined);
  });

  it("createTeamInvite throws TEAM_NOT_FOUND when team is missing", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue(null);
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).rejects.toEqual({
      code: "TEAM_NOT_FOUND",
    });
  });

  it("createTeamInvite throws TEAM_ARCHIVED for archived teams", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ archivedAt: new Date(), allocationLifecycle: "ACTIVE" });
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).rejects.toEqual({
      code: "TEAM_ARCHIVED",
    });
  });

  it("createTeamInvite throws TEAM_NOT_ACTIVE for draft teams", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ archivedAt: null, allocationLifecycle: "DRAFT" });
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).rejects.toEqual({
      code: "TEAM_NOT_ACTIVE",
    });
  });

  it("createTeamInvite throws TEAM_ACCESS_FORBIDDEN when inviter is not allocated", async () => {
    mocks.prisma.teamAllocation.findUnique.mockResolvedValue(null);
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).rejects.toEqual({
      code: "TEAM_ACCESS_FORBIDDEN",
    });
  });

  it("createTeamInvite throws INVITEE_NOT_ELIGIBLE_FOR_PROJECT when email is not eligible", async () => {
    mocks.repo.findInviteEligibleStudentForTeamByEmail.mockResolvedValue(null);
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).rejects.toEqual({
      code: "INVITEE_NOT_ELIGIBLE_FOR_PROJECT",
    });
  });

  it("createTeamInvite throws INVITE_ALREADY_PENDING when duplicate invite exists", async () => {
    mocks.repo.findActiveInvite.mockResolvedValue({ id: "inv-0" });
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).rejects.toEqual({
      code: "INVITE_ALREADY_PENDING",
    });
  });

  it("createTeamInvite returns invite and normalized token payload", async () => {
    const result = await createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "  X@Y.COM  ", baseUrl: "" });
    expect(result.invite).toEqual({ id: "inv-1", teamId: 2 });
    expect(result.rawToken).toBeTypeOf("string");
    expect(result.rawToken.length).toBe(64);
    expect(mocks.repo.createTeamInviteRecord).toHaveBeenCalledWith(
      expect.objectContaining({ inviteeEmail: "x@y.com", inviteeId: 77 }),
    );
  });

  it("createTeamInvite sends dedicated invite email and creates team invite notification", async () => {
    await createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "http://localhost:3000" });

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "x@y.com",
        subject: "Team invitation",
      }),
    );
    expect(mocks.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 77,
        type: "TEAM_INVITE",
      }),
    );
  });

  it("createTeamInvite tolerates email and notification failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendEmail.mockRejectedValueOnce(new Error("smtp down"));
    mocks.addNotification.mockRejectedValueOnce(new Error("notify down"));
    await expect(createTeamInvite({ teamId: 2, inviterId: 4, inviteeEmail: "x@y.com", baseUrl: "" })).resolves.toEqual(
      expect.objectContaining({ invite: { id: "inv-1", teamId: 2 } }),
    );
    errorSpy.mockRestore();
  });

  it("listTeamInvites throws TEAM_NOT_FOUND_OR_INACTIVE when team is archived", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ id: 2, archivedAt: new Date(), allocationLifecycle: "ACTIVE" });
    await expect(listTeamInvites(2, 4)).rejects.toEqual({ code: "TEAM_NOT_FOUND_OR_INACTIVE" });
  });

  it("listTeamInvites throws TEAM_ACCESS_FORBIDDEN for invalid requester", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ id: 2, archivedAt: null, allocationLifecycle: "ACTIVE" });
    await expect(listTeamInvites(2, 0)).rejects.toEqual({ code: "TEAM_ACCESS_FORBIDDEN" });
  });

  it("listTeamInvites throws TEAM_ACCESS_FORBIDDEN when requester is outside the team", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ id: 2, archivedAt: null, allocationLifecycle: "ACTIVE" });
    mocks.prisma.teamAllocation.findUnique.mockResolvedValue(null);
    await expect(listTeamInvites(2, 4)).rejects.toEqual({ code: "TEAM_ACCESS_FORBIDDEN" });
  });

  it("listTeamInvites returns invites for valid requesters", async () => {
    const invites = await listTeamInvites(2, 4);
    expect(invites).toEqual([{ id: "inv-1" }]);
    expect(mocks.repo.getInvitesForTeam).toHaveBeenCalledWith(2);
  });

  it("listReceivedInvites throws USER_NOT_FOUND when user row is missing", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    await expect(listReceivedInvites(44)).rejects.toEqual({ code: "USER_NOT_FOUND" });
  });

  it("listReceivedInvites resolves with pending invites", async () => {
    const invites = await listReceivedInvites(44);
    expect(invites).toEqual([{ id: "inv-2" }]);
    expect(mocks.repo.findPendingInvitesForEmail).toHaveBeenCalledWith("invitee@example.com");
  });

  it("acceptTeamInvite throws INVITE_NOT_PENDING when transition fails", async () => {
    mocks.repo.updateInviteStatusFromPending.mockResolvedValue(null);
    await expect(acceptTeamInvite("inv-1", 44)).rejects.toEqual({ code: "INVITE_NOT_PENDING" });
  });

  it("acceptTeamInvite ignores MEMBER_ALREADY_EXISTS when adding user", async () => {
    mocks.repo.addUserToTeam.mockRejectedValue({ code: "MEMBER_ALREADY_EXISTS" });
    await expect(acceptTeamInvite("inv-1", 44)).resolves.toEqual(expect.objectContaining({ id: "inv-1" }));
  });

  it.each([
    [declineTeamInvite, "DECLINED"],
    [rejectTeamInvite, "DECLINED"],
    [cancelTeamInvite, "CANCELLED"],
    [expireTeamInvite, "EXPIRED"],
  ])("transition handler sends status %s", async (fn: (inviteId: string) => Promise<unknown>, status: string) => {
    await fn("inv-1");
    expect(mocks.repo.updateInviteStatusFromPending).toHaveBeenCalledWith("inv-1", status, expect.any(Date));
  });

  it("listInviteEligibleStudents delegates to scoped repo", async () => {
    await expect(listInviteEligibleStudents(2, 4)).resolves.toEqual([{ id: 31 }]);
    expect(mocks.repo.findInviteEligibleStudentsForTeam).toHaveBeenCalledWith(2, 4);
  });
});
