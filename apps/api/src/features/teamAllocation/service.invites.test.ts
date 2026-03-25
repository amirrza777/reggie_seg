import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "./repo.js";
import { sendEmail } from "../../shared/email.js";
import { prisma } from "../../shared/db.js";
import { acceptTeamInvite, createTeamInvite, declineTeamInvite, listReceivedInvites } from "./service.invites.js";

vi.mock("./repo.js", () => ({
  TeamService: { addUserToTeam: vi.fn() },
  createTeamInviteRecord: vi.fn(),
  findActiveInvite: vi.fn(),
  findInviteContext: vi.fn(),
  findPendingInvitesForEmail: vi.fn(),
  getInvitesForTeam: vi.fn(),
  updateInviteStatusFromPending: vi.fn(),
}));
vi.mock("../../shared/email.js", () => ({ sendEmail: vi.fn() }));
vi.mock("../notifications/service.js", () => ({ addNotification: vi.fn() }));
vi.mock("../../shared/db.js", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    teamAllocation: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));

describe("service invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.team.findUnique as any).mockResolvedValue({ archivedAt: null, allocationLifecycle: "ACTIVE" });
    (prisma.teamAllocation.findUnique as any).mockResolvedValue({ teamId: 3 });
    (repo.findActiveInvite as any).mockResolvedValue(null);
    (repo.createTeamInviteRecord as any).mockResolvedValue({ id: "inv-1" });
    (repo.findInviteContext as any).mockResolvedValue({ team: { teamName: "Blue", projectId: 9 }, inviter: { firstName: "A", lastName: "B", email: "a@b.com" } });
    (prisma.user.findFirst as any).mockResolvedValue({ id: 99 });
  });

  it("creates invite and normalizes invitee email", async () => {
    const result = await createTeamInvite({ teamId: 3, inviterId: 2, inviteeEmail: " User@Example.com ", baseUrl: "http://x" });
    expect(repo.findActiveInvite).toHaveBeenCalledWith(3, "user@example.com");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@example.com" }));
    expect(result.invite.id).toBe("inv-1");
  });

  it("rejects listReceivedInvites for unknown users", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(listReceivedInvites(33)).rejects.toEqual({ code: "USER_NOT_FOUND" });
  });

  it("accepts invite when member already exists", async () => {
    (repo.updateInviteStatusFromPending as any).mockResolvedValue({ id: "inv-1", teamId: 4 });
    (repo.TeamService.addUserToTeam as any).mockRejectedValue({ code: "MEMBER_ALREADY_EXISTS" });
    await expect(acceptTeamInvite("inv-1", 3)).resolves.toEqual({ id: "inv-1", teamId: 4 });
  });

  it("decline rejects when invite is not pending", async () => {
    (repo.updateInviteStatusFromPending as any).mockResolvedValue(null);
    await expect(declineTeamInvite("inv-9")).rejects.toEqual({ code: "INVITE_NOT_PENDING" });
  });
});