import { Router } from "express"
import {
  getTeammatesHandler,
  createAssessmentHandler,
  getAssessmentHandler,
  updateAssessmentHandler
} from "./controller"

const router = Router()

router.get("/teams/:teamId/teammates", getTeammatesHandler)
router.post("/", createAssessmentHandler)
router.get("/", getAssessmentHandler)
router.put("/:id", updateAssessmentHandler)

export default router
