import { TrelloRepo } from "./repo.js"

const TRELLO_KEY = process.env.TRELLO_KEY

function requireTrelloKey() {
  if (!TRELLO_KEY) throw new Error("Trello is not configured on this server")
  return TRELLO_KEY
}

export const TrelloService = {
  async getTrelloMember(token: string) {
    const trelloKey = requireTrelloKey()
    const res = await fetch(
      `https://api.trello.com/1/members/me?key=${trelloKey}&token=${token}`
    )
    if (!res.ok) throw new Error("Failed to fetch Trello member")
    return res.json()
  },

  async getUserBoards(token: string) {
    const trelloKey = requireTrelloKey()
    const res = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${trelloKey}&token=${token}`
    )
    if (!res.ok) throw new Error("Failed to fetch boards")
    return res.json()
  },

  async getBoardWithData(boardId: string, token: string) {
    const trelloKey = requireTrelloKey()
    const res = await fetch(
      `https://api.trello.com/1/boards/${boardId}?lists=open&cards=open&key=${trelloKey}&token=${token}`
    )
    if (!res.ok) throw new Error("Failed to fetch board")
    return res.json()
  },

  // Business logic + DB calls via repo
  async saveUserToken(userId: number, token: string, trelloMemberId: string) {
    return TrelloRepo.updateUserTrelloToken(userId, token, trelloMemberId)
  },

  async assignBoard(teamId: number, boardId: string, ownerId: number) {
    return TrelloRepo.assignBoard(teamId, boardId, ownerId)
  },

  async fetchTeamBoard(teamId: number, userId: number) {
    const isMember = await TrelloRepo.isUserInTeam(userId, teamId)
    if (!isMember) throw new Error("Not a member of this team")

    const team = await TrelloRepo.getTeamWithOwner(teamId)
    if (!team?.trelloBoardId) throw new Error("No board assigned")
    if (!team.trelloOwner?.trelloToken)
      throw new Error("Team owner not connected to Trello")

    return TrelloService.getBoardWithData(
      team.trelloBoardId,
      team.trelloOwner.trelloToken
    )
  },

  async fetchOwnerBoards(userId: number) {
    const user = await TrelloRepo.getUserById(userId)
    if (!user?.trelloToken) throw new Error("User not connected to Trello")
    return TrelloService.getUserBoards(user.trelloToken)
  }
}
