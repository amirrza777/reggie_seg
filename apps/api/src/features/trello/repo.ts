import { prisma } from "../../shared/db.js";
import { Prisma } from "@prisma/client";

export const TrelloRepo = {
  //Stores Trello credentials in db
  async updateUserTrelloToken(userId: number, token: string, trelloMemberId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { trelloToken: token, trelloMemberId }
    })
  },

  //Assigns a board to a team
  async assignBoard(teamId: number, boardId: string, ownerId: number) {
    return prisma.team.update({
      where: { id: teamId },
      data: { trelloBoardId: boardId, trelloOwnerId: ownerId }
    })
  },

  //Returns a team with its Trello owner
  async getTeamWithOwner(teamId: number) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: { trelloOwner: true }
    })
  },

  async isUserInTeam(userId: number, teamId: number) {
    const membership = await prisma.teamAllocation.findUnique({
      where: { teamId_userId: { userId, teamId } }
    })
    return !!membership
  },

  async getUserById(userId: number) {
    return prisma.user.findUnique({ where: { id: userId } })
  }
}
