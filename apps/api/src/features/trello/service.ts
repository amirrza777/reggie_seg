import { TrelloRepo } from "./repo.js"
import { matchesFuzzySearchCandidate } from "../../shared/fuzzySearch.js"
import { canStaffAccessTeamInProject } from "../projects/team-health-review/repo.js"

type TrelloBoard = Record<string, unknown> & {
  id?: unknown
  name?: unknown
}

function isTrelloBoard(value: unknown): value is TrelloBoard {
  return typeof value === "object" && value !== null
}

function parseBoardId(board: TrelloBoard): string {
  return typeof board.id === "string" ? board.id : ""
}

function matchesBoardId(value: unknown, boardId: string): boolean {
  return isTrelloBoard(value) && parseBoardId(value) === boardId
}

function normalizeBoardCollection(value: unknown): TrelloBoard[] {
  if (!Array.isArray(value)) return []
  return value.filter(isTrelloBoard)
}

function matchesBoardSearchQuery(board: TrelloBoard, query: string): boolean {
  const boardName = typeof board.name === "string" ? board.name : ""
  const boardId = parseBoardId(board)
  return matchesFuzzySearchCandidate({
    query,
    sources: [boardName, boardId],
  })
}

//Fails early if Trello env is missing.
function requireTrelloKey() {
  const trelloKey = process.env.TRELLO_KEY
  if (!trelloKey) throw new Error("Trello is not configured on this server.")
  return trelloKey
}


export const TrelloService = {
  //Builds the Trello authorisation URL
  getAuthoriseUrl(callbackUrl?: string) {
    const trelloKey = requireTrelloKey()
    if (typeof callbackUrl !== "string" || !callbackUrl.startsWith("http")) {
      throw new Error("Valid callback URL is required (e.g. app origin + /projects/:projectId/trello/callback)")
    }

    const appName = process.env.TRELLO_APP_NAME || "TeamFeedback2Keys"
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
    const payload: unknown = await res.json()
    return normalizeBoardCollection(payload)
  },

  async getBoardWithData(boardId: string, token: string) {
    const trelloKey = requireTrelloKey()
    const boardParams = new URLSearchParams({
      lists: "open",
      cards: "open",
      key: trelloKey,
      token,
      members: "all",
      member_fields: "fullName,initials",
      labels: "all",
      card_fields: "name,desc,idList,due,dateLastActivity,idMembers,labels",
    })
    const boardRes = await fetch(
      `https://api.trello.com/1/boards/${boardId}?${boardParams.toString()}`
    )
    if (!boardRes.ok) throw new Error("Failed to fetch board")
    const board = await boardRes.json()

    board.actions = await TrelloService.getBoardHistory(boardId, token)
    return board
  },

  async getBoardHistory(boardId: string, token: string) {
    const trelloKey = requireTrelloKey()
    const params = new URLSearchParams({
      filter: "createCard,updateCard:idList",
      limit: "500",
      fields: "type,date,data",
      key: trelloKey,
      token,
    })
    const res = await fetch(
      `https://api.trello.com/1/boards/${boardId}/actions?${params.toString()}`
    )
    if (!res.ok) return []
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
    const boardExists = ownerBoards.some((board) => matchesBoardId(board, boardId))
    if (!boardExists) throw new Error("Board does not belong to owner")

    return TrelloRepo.assignBoard(teamId, boardId, ownerId)
  },

  /** Throws if the user is not a member of the team */
  async assertTeamMember(teamId: number, userId: number) {
    const isMember = await TrelloRepo.isUserInTeam(userId, teamId)
    if (!isMember) throw new Error("Not a member of this team")
  },

  async fetchAssignedTeamBoard(teamId: number, userId: number) {
    const team = await TrelloRepo.getTeamWithOwner(teamId)
    if (!team) throw new Error("Team not found")

    const isMember = await TrelloRepo.isUserInTeam(userId, teamId)
    const staffCanView =
      !isMember && (await canStaffAccessTeamInProject(userId, team.projectId, teamId))
    if (!isMember && !staffCanView) {
      throw new Error("Not a member of this team")
    }

    if (!team.trelloBoardId) throw new Error("No board assigned")
    if (!team.trelloOwner?.trelloToken)
      throw new Error("Team owner not connected to Trello")

    const board = await TrelloService.getBoardWithData(
      team.trelloBoardId,
      team.trelloOwner.trelloToken
    )

    const user = await TrelloRepo.getUserById(userId)

    // Team members must be on the Trello board (when they have a linked Trello identity). Staff viewers skip this.
    if (
      isMember &&
      user?.trelloMemberId &&
      Array.isArray(board.members)
    ) {
      const isOnBoard = board.members.some((m: { id?: string }) => m?.id === user.trelloMemberId)
      if (!isOnBoard && board.url) {
        return { requireJoin: true, boardUrl: board.url }
      }
    }

    const sectionConfig =
      team.trelloSectionConfig && typeof team.trelloSectionConfig === "object" && !Array.isArray(team.trelloSectionConfig)
        ? (team.trelloSectionConfig as Record<string, string>)
        : {}
    return { board, sectionConfig }
  },

  async updateTeamTrelloSectionConfig(teamId: number, userId: number, config: Record<string, string>) {
    await TrelloService.assertTeamMember(teamId, userId)
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(config)) {
      if (typeof key === "string" && typeof value === "string") normalized[key] = value
    }
    await TrelloRepo.setTeamTrelloSectionConfig(teamId, normalized)
  },

  async fetchMyBoards(userId: number, options?: { query?: string | null }) {
    const user = await TrelloRepo.getUserById(userId)
    if (!user?.trelloToken) throw new Error("User not connected to Trello")
    const boards = await TrelloService.getUserBoards(user.trelloToken)
    const searchQuery = typeof options?.query === "string" ? options.query.trim() : ""
    if (!searchQuery) {
      return boards
    }

    return boards.filter((board) => matchesBoardSearchQuery(board, searchQuery))
  },

  async fetchBoardById(userId: number, boardId: string) {
    if (!boardId) throw new Error("Missing boardId")

    const user = await TrelloRepo.getUserById(userId)
    if (!user?.trelloToken) throw new Error("User not connected to Trello")
    const boards = await TrelloService.getUserBoards(user.trelloToken)
    const isOwnerBoard = boards.some((board) => matchesBoardId(board, boardId))
    if (!isOwnerBoard) throw new Error("Board not found for this user")

    return TrelloService.getBoardWithData(boardId, user.trelloToken)
  },
}
