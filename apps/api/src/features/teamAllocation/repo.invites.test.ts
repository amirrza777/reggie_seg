import { beforeEach, describe, expect, it } from "vitest";
import { prisma, setupTeamAllocationRepoTestDefaults } from "./repo.invites-scope.test-helpers.js";
import {
  createTeamInviteRecord,
  findActiveInvite,
  findInviteContext,
  getInvitesForTeam,
} from "./repo.js";

describe("teamAllocation repo invites", () => {
  beforeEach(() => {
    setupTeamAllocationRepoTestDefaults();
  });

  it("findActiveInvite queries active pending invite by team and email", async () => {
    await findActiveInvite(2, "user@example.com");

    expect(prisma.teamInvite.findFirst).toHaveBeenCalledWith({
      where: {
        teamId: 2,
        inviteeEmail: "user@example.com",
        active: true,
        status: "PENDING",
        team: {
          archivedAt: null,
          allocationLifecycle: "ACTIVE",
        },
      },
    });
  });

  it("createTeamInviteRecord creates pending active invite", async () => {
    const expiresAt = new Date("2026-03-07T12:00:00.000Z");

    await createTeamInviteRecord({
      teamId: 4,
      inviterId: 9,
      inviteeId: 11,
      inviteeEmail: "user@example.com",
      tokenHash: "hash",
      expiresAt,
      message: "Hello",
    });

    expect(prisma.teamInvite.create).toHaveBeenCalledWith({
      data: {
        teamId: 4,
        inviterId: 9,
        inviteeId: 11,
        inviteeEmail: "user@example.com",
        tokenHash: "hash",
        expiresAt,
        status: "PENDING",
        active: true,
        message: "Hello",
      },
    });
  });

  it("findInviteContext fetches team and inviter", async () => {
    await findInviteContext(5, 8);

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { teamName: true, projectId: true },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 8 },
      select: { firstName: true, lastName: true, email: true },
    });
  });

  it("getInvitesForTeam returns ordered invites", async () => {
    await getInvitesForTeam(12);

    expect(prisma.teamInvite.findMany).toHaveBeenCalledWith({
      where: { teamId: 12 },
      orderBy: { createdAt: "desc" },
      include: {
        inviter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  });
});
