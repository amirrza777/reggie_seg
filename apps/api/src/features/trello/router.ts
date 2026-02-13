import { Router } from "express"
import { TrelloController } from "./controller.js"
import { requireAuth } from "../../auth/middleware.js"

const router = Router()

router.post("/assign", requireAuth, TrelloController.assignBoardToTeam)
router.get("/team-board", requireAuth, TrelloController.fetchAssignedTeamBoard)
router.get("/boards", requireAuth, TrelloController.fetchMyBoards)
router.get("/boards/:boardId", requireAuth, TrelloController.fetchBoardById)

router.get("/connect-url", requireAuth, TrelloController.getConnectUrl)
router.get("/connect", requireAuth, TrelloController.connect)
router.post("/callback", requireAuth, TrelloController.callback)
router.get("/callback", TrelloController.callbackGetUnsupported)

export default router
