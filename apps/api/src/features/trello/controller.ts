import type { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { TrelloRepo } from "./repo.js"
import { TrelloService } from "./service.js"
import { parseSearchQuery } from "../../shared/search.js"

const accessSecret = process.env.JWT_ACCESS_SECRET || ""

type TrelloLinkTokenPayload = { sub: number; purpose?: string }

function parseTrelloLinkTokenPayload(payload: string | jwt.JwtPayload): TrelloLinkTokenPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const sub = payload.sub
  const purpose = payload.purpose
  if (typeof sub !== "number" || !Number.isFinite(sub)) return null
  if (purpose !== undefined && typeof purpose !== "string") return null
  return { sub, purpose }
}

export const TrelloController = {

  async getMyTrelloMemberId(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.sub
      if (!userId) return res.status(401).json({ error: "Not authenticated" })
      const user = await TrelloRepo.getUserById(userId)
      return res.status(200).json({ trelloMemberId: user?.trelloMemberId ?? null })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  },

  /** Returns linked Trello profile (fullName, username) when user has connected Trello. */
  async getMyTrelloProfile(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.sub
      if (!userId) return res.status(401).json({ error: "Not authenticated" })
      const user = await TrelloRepo.getUserById(userId)
      if (!user?.trelloToken) {
        return res.status(200).json({ trelloMemberId: null })
      }
      const member = await TrelloService.getTrelloMember(user.trelloToken)
      return res.status(200).json({
        trelloMemberId: member?.id ?? null,
        fullName: member?.fullName ?? null,
        username: member?.username ?? null,
      })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  },

  /** Returns a short-lived link token so the callback page can complete the flow without cookies. */
  getLinkToken(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.sub
      if (!userId) return res.status(401).json({ error: "Not authenticated" })
      const linkToken = jwt.sign(
        { sub: userId, purpose: "trello-link" },
        accessSecret,
        { expiresIn: "5m" }
      )
      return res.status(200).json({ linkToken })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  },

  //Returns an auth URL the frontend can redirect to
  getConnectUrl(req: Request, res: Response) {
    try {
      const callbackUrl = typeof req.query?.callbackUrl === "string" ? req.query.callbackUrl : ""
      if (!callbackUrl.startsWith("http")) {
        return res.status(400).json({ error: "callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)" })
      }
      const url = TrelloService.getAuthoriseUrl(callbackUrl)
      return res.status(200).json({ url })
    } catch (err: any) {
      return res.status(503).json({ error: err.message })
    }
  },

  //Redirects endpoint for browser navigation.
  connect(req: Request, res: Response) {
    try {
      const callbackUrl = typeof req.query?.callbackUrl === "string" ? req.query.callbackUrl : ""
      if (!callbackUrl.startsWith("http")) {
        return res.status(400).json({ error: "callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)" })
      }
      const url = TrelloService.getAuthoriseUrl(callbackUrl)
      return res.redirect(url)
    } catch (err: any) {
      return res.status(503).json({ error: err.message })
    }
  },

  //Receives Trello token from frontend callback page and links it to current user
  async callback(req: Request, res: Response) {
    try {
      const token = String(req.body?.token ?? "")
      const userId = (req.user as any).sub as number
      await TrelloService.completeOauthCallback(userId, token)
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  },

  /** Completes Trello link using a short-lived link token (no session cookie needed). */
  async callbackWithLinkToken(req: Request, res: Response) {
    try {
      const linkToken = String(req.body?.linkToken ?? "").trim()
      const token = String(req.body?.token ?? "").trim()
      if (!linkToken || !token) {
        return res.status(400).json({ error: "Missing linkToken or token" })
      }
      const verified = jwt.verify(linkToken, accessSecret)
      const payload = parseTrelloLinkTokenPayload(verified)
      if (!payload) {
        return res.status(400).json({ error: "Invalid link token" })
      }
      if (payload.purpose !== "trello-link") {
        return res.status(400).json({ error: "Invalid link token" })
      }
      await TrelloService.completeOauthCallback(payload.sub, token)
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Link token expired. Start the flow again from the project Trello page." })
      }
      return res.status(400).json({ error: err?.message ?? "Invalid link token" })
    }
  },

  //Trello token flow is handled via POST. GET is intentionally halted
  callbackGetUnsupported(_req: Request, res: Response) {
    return res
      .status(405)
      .json({ error: "Use POST /trello/callback after handling Trello token on the frontend callback page." })
  },

  //Assigns one Trello board to one team
  async assignBoardToTeam(req: Request, res: Response) {
    try {
      const teamId = Number(req.body?.teamId)
      const boardId = String(req.body?.boardId ?? "").trim()
      const ownerId = (req.user as any).sub as number

      if (!teamId || !boardId) {
        return res.status(400).json({ error: "Missing teamId or boardId" })
      }

      await TrelloService.assignBoardToTeam(teamId, boardId, ownerId)
      res.status(200).json({ message: "Board assigned" })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },

  //Returns the board assigned to a team
  async fetchAssignedTeamBoard(req: Request, res: Response) {
    try {
      const teamId = Number(req.query.teamId)
      if (!teamId) return res.status(400).json({ error: "Missing teamId" })
      const userId = (req.user as any).sub
      const board = await TrelloService.fetchAssignedTeamBoard(teamId, userId)
      res.status(200).json(board)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },

  //Returns boards visible to the logged-in Trello account
  async fetchMyBoards(req: Request, res: Response) {
    try {
      const userId = (req.user as any).sub
      const parsedSearchQuery = parseSearchQuery(req.query?.q)
      if (!parsedSearchQuery.ok) {
        return res.status(400).json({ error: parsedSearchQuery.error })
      }
      const boards = await TrelloService.fetchMyBoards(userId, { query: parsedSearchQuery.value })
      res.status(200).json(boards)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },

  /** Saves trello status config (list name -> status). */
  async putTrelloSectionConfig(req: Request, res: Response) {
    try {
      const teamId = Number(req.body?.teamId)
      const config = req.body?.config
      if (!teamId || !config || typeof config !== "object" || Array.isArray(config)) {
        return res.status(400).json({ error: "Missing or invalid teamId and config (object)" })
      }
      const userId = (req.user as any).sub
      await TrelloService.updateTeamTrelloSectionConfig(teamId, userId, config)
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      if (err?.message === "Not a member of this team") return res.status(403).json({ error: err.message })
      return res.status(500).json({ error: err.message })
    }
  },

  //Returns a board by id
  async fetchBoardById(req: Request, res: Response) {
    try {
      const userId = (req.user as any).sub
      const boardId = typeof req.params.boardId === "string" ? req.params.boardId : ""
      const board = await TrelloService.fetchBoardById(userId, boardId)
      res.status(200).json(board)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },
}
