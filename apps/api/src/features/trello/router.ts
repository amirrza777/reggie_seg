import { Router } from "express"
import { TrelloController } from "./controller.js"
import { requireAuth } from "../../auth/middleware.js"

const router = Router()

router.post("/assign", requireAuth, TrelloController.assignBoard)
router.get("/team-board", requireAuth, TrelloController.fetchTeamBoard)
router.get("/owner-boards", requireAuth, TrelloController.fetchOwnerBoards)

export default router
