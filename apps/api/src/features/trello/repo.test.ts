import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloRepo } from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    teamAllocation: {
      findUnique: vi.fn(),
    },
  },
}));

describe("TrelloRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //checks that updateUserTrelloToken correctly updates the user's trello token and member id in db
  describe("updateUserTrelloToken", () => {
    it("updates user trello token and member id", async () => {
      const mockUser = { id: 1, trelloToken: "abc", trelloMemberId: "m1" };
      (prisma.user.update as any).mockResolvedValue(mockUser);

      const result = await TrelloRepo.updateUserTrelloToken(1, "abc", "m1");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { trelloToken: "abc", trelloMemberId: "m1" },
      });

      expect(result).toEqual(mockUser);
    });
  });

  //checks that assignBoard correctly updates the team's trello board id and owner id in db
  describe("assignBoard", () => {
    it("assigns board to team", async () => {
      const mockTeam = { id: 2, trelloBoardId: "board1", trelloOwnerId: 1 };
      (prisma.team.update as any).mockResolvedValue(mockTeam);

      const result = await TrelloRepo.assignBoard(2, "board1", 1);

      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { trelloBoardId: "board1", trelloOwnerId: 1 },
      });

      expect(result).toEqual(mockTeam);
    });
  });

  //checks that getTeamWithOwner returns the team with its trello owner included
  describe("getTeamWithOwner", () => {
    it("returns team including trello owner", async () => {
      const mockTeam = {
        id: 2,
        trelloOwner: { id: 1, name: "Owner" },
      };

      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);

      const result = await TrelloRepo.getTeamWithOwner(2);

      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        include: { trelloOwner: true },
      });

      expect(result).toEqual(mockTeam);
    });
  });

  //checks that isUserInTeam returns true if a team allocation exists for the given user and team, and false otherwise
  describe("isUserInTeam", () => {
    it("returns true if membership exists", async () => {
      (prisma.teamAllocation.findUnique as any).mockResolvedValue({
        userId: 1,
        teamId: 2,
      });

      const result = await TrelloRepo.isUserInTeam(1, 2);

      expect(prisma.teamAllocation.findUnique).toHaveBeenCalledWith({
        where: { teamId_userId: { userId: 1, teamId: 2 } },
      });

      expect(result).toBe(true);
    });

    it("returns false if membership does not exist", async () => {
      (prisma.teamAllocation.findUnique as any).mockResolvedValue(null);

      const result = await TrelloRepo.isUserInTeam(1, 2);

      expect(result).toBe(false);
    });
  });

  //checks that getUserById returns the user with the given id
  describe("getUserById", () => {
    it("returns user by id", async () => {
      const mockUser = { id: 1, name: "Test User" };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await TrelloRepo.getUserById(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(result).toEqual(mockUser);
    });
  });
});
