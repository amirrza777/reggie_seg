import type { Request, Response } from "express"
import { TrelloService } from "./service.js"

export const TrelloController = {

  //Returns an auth URL the frontend can redirect to
  getConnectUrl(_req: Request, res: Response) {
    try {
      const url = TrelloService.getAuthoriseUrl()
      return res.status(200).json({ url })
    } catch (err: any) {
      return res.status(503).json({ error: err.message })
    }
  },

  //Redirects endpoint for browser navigation
  connect(_req: Request, res: Response) {
    try {
      const url = TrelloService.getAuthoriseUrl()
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
      const boards = await TrelloService.fetchMyBoards(userId)
      res.status(200).json(boards)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },

  //Returns a board by id
  async fetchBoardById(req: Request, res: Response) {
    try {
      const userId = (req.user as any).sub
      const boardId = req.params.boardId
      const board = await TrelloService.fetchBoardById(userId, boardId)
      res.status(200).json(board)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },
}
