import { Request, Response } from "express"
import { TrelloService } from "./service"

export const TrelloController = {
  async assignBoard(req: Request, res: Response) {
    try {
      const { teamId, boardId, ownerId } = req.body
      await TrelloService.assignBoard(teamId, boardId, ownerId)
      res.status(200).json({ message: "Board assigned" })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },

  async fetchTeamBoard(req: Request, res: Response) {
    try {
      const teamId = Number(req.query.teamId)
      if (!teamId) return res.status(400).json({ error: "Missing teamId" })
      const userId = (req.user as any).sub
      const board = await TrelloService.fetchTeamBoard(teamId, userId)
      res.status(200).json(board)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  },

  async fetchOwnerBoards(req: Request, res: Response) {
    try {
      const userId = (req.user as any).sub
      const boards = await TrelloService.fetchOwnerBoards(userId)
      res.status(200).json(boards)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  }
}
