import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTeamHealthMessage,
  getTeamHealthMessagesForTeamInProject,
  getTeamHealthMessagesForUserInProject,
  reviewTeamHealthMessage,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    teamAllocation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    module: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    moduleLead: {
      findFirst: vi.fn(),
    },
    questionnaireTemplate: {
      findFirst: vi.fn(),
    },
    teamHealthMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamDeadlineOverride: {
      deleteMany: vi.fn(),
    },
  },
}));

describe("projects repo team health message queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamHealthMessage persists request with expected selected fields", async () => {
    await createTeamHealthMessage(3, 4, 7, "Need support", "Please review team dynamics");

    expect(prisma.teamHealthMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          projectId: 3,
          teamId: 4,
          requesterUserId: 7,
          subject: "Need support",
          details: "Please review team dynamics",
        },
        select: expect.objectContaining({
          id: true,
          resolved: true,
          requester: expect.any(Object),
          reviewedBy: expect.any(Object),
        }),
      }),
    );
  });

  it("lists team health messages for requester and staff team with descending createdAt order", async () => {
    await getTeamHealthMessagesForUserInProject(3, 7);
    expect(prisma.teamHealthMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, requesterUserId: 7 },
        orderBy: { createdAt: "desc" },
      }),
    );

    await getTeamHealthMessagesForTeamInProject(3, 4);
    expect(prisma.teamHealthMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, teamId: 4 },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("reviewTeamHealthMessage marks request as unresolved without deleting override", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.teamHealthMessage.update as any).mockResolvedValueOnce({ id: 11, resolved: false });

    await reviewTeamHealthMessage(3, 4, 11, 7, false);

    expect(prisma.teamHealthMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          resolved: false,
          reviewedByUserId: 7,
          reviewedAt: expect.any(Date),
          responseText: null,
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reviewTeamHealthMessage marks resolved request as unresolved and removes team deadline override", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: true });
    const deleteMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const updateRequest = vi.fn().mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamDeadlineOverride: { deleteMany },
        teamHealthMessage: { update: updateRequest },
      }),
    );

    const result = await reviewTeamHealthMessage(3, 4, 11, 7, false);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { teamId: 4 } });
    expect(updateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          resolved: false,
          reviewedByUserId: 7,
          reviewedAt: expect.any(Date),
          responseText: null,
        }),
      }),
    );
    expect(result).toEqual({ id: 11, resolved: false });
  });
});
