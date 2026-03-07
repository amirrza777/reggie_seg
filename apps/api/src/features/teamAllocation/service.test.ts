import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptTeamInvite,
  addUserToTeam,
  cancelTeamInvite,
  createTeam,
  createTeamInvite,
  declineTeamInvite,
  expireTeamInvite,
  getTeamById,
  getTeamMembers,
  listTeamInvites,
  rejectTeamInvite,
} from "./service.js";
import * as repo from "./repo.js";
import { sendEmail } from "../../shared/email.js";

vi.mock("./repo.js", () => ({
  createTeamInviteRecord: vi.fn(),
  findActiveInvite: vi.fn(),
  findInviteContext: vi.fn(),
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

describe("teamAllocation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
