import { TrelloRepo } from "./repo.js"

const TRELLO_KEY = process.env.TRELLO_KEY

//Fails early if Trello env is missing.
function requireTrelloKey() {
  if (!TRELLO_KEY) throw new Error("Trello is not configured on this server")
  return TRELLO_KEY
}

export const TrelloService = {
  //Builds the Trello authorisation URL
  getAuthoriseUrl() {
    const trelloKey = process.env.TRELLO_KEY
    if (!trelloKey) throw new Error("Trello is not configured on this server.")

    const appName = process.env.TRELLO_APP_NAME || "Team Feedback"
    const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "")
    const callbackUrl = `${appBaseUrl}/trello-test/callback`

    return `https://trello.com/1/authorize?key=${trelloKey}&name=${encodeURIComponent(appName)}&scope=read&expiration=never&response_type=token&return_url=${encodeURIComponent(callbackUrl)}`
  },

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

  //Saves linked Trello credentials
  async saveUserToken(userId: number, token: string, trelloMemberId: string) {
    return TrelloRepo.updateUserTrelloToken(userId, token, trelloMemberId)
  },

  //Finalises OAuth callback by validating token against Trello and saving identity.
  async completeOauthCallback(userId: number, token: string) {
    if (!token) throw new Error("Missing token")
    if (!userId) throw new Error("Missing userId")

    const memberData = await TrelloService.getTrelloMember(token)
    const trelloMemberId = memberData?.id
    if (!trelloMemberId) throw new Error("Failed to fetch Trello member")

    await TrelloService.saveUserToken(userId, token, trelloMemberId)
  },

  async assignBoardToTeam(teamId: number, boardId: string, ownerId: number) {
    if (!teamId || !boardId || !ownerId) throw new Error("Missing teamId, boardId, or ownerId")

    const owner = await TrelloRepo.getUserById(ownerId)
    if (!owner?.trelloToken) throw new Error("Owner is not connected to Trello")

    //Ensures only boards from the owner's Trello account can be assigned
    const ownerBoards = await TrelloService.getUserBoards(owner.trelloToken)
    const boardExists = Array.isArray(ownerBoards) && ownerBoards.some((board: any) => board?.id === boardId)
    if (!boardExists) throw new Error("Board does not belong to owner")

    return TrelloRepo.assignBoard(teamId, boardId, ownerId)
  },

  async fetchAssignedTeamBoard(teamId: number, userId: number) {
    const isMember = await TrelloRepo.isUserInTeam(userId, teamId)
    if (!isMember) throw new Error("Not a member of this team")

    const team = await TrelloRepo.getTeamWithOwner(teamId)
    if (!team?.trelloBoardId) throw new Error("No board assigned")
    if (!team.trelloOwner?.trelloToken)
      throw new Error("Team owner not connected to Trello")

    //Team board is fetched with owner's token
    return TrelloService.getBoardWithData(
      team.trelloBoardId,
      team.trelloOwner.trelloToken
    )
  },

  async fetchMyBoards(userId: number) {
    const user = await TrelloRepo.getUserById(userId)
    if (!user?.trelloToken) throw new Error("User not connected to Trello")
    return TrelloService.getUserBoards(user.trelloToken)
  },

  async fetchBoardById(userId: number, boardId: string) {
    if (!boardId) throw new Error("Missing boardId")

    const user = await TrelloRepo.getUserById(userId)
    if (!user?.trelloToken) throw new Error("User not connected to Trello")
    const boards = await TrelloService.getUserBoards(user.trelloToken)
    const isOwnerBoard = Array.isArray(boards) && boards.some((board: any) => board?.id === boardId)
    if (!isOwnerBoard) throw new Error("Board not found for this user")

    return TrelloService.getBoardWithData(boardId, user.trelloToken)
  },
}
