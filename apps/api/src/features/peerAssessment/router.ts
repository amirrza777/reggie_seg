import { Router } from "express";

const router = Router();

import {
  getTeammatesHandler,
  createAssessmentHandler,
  getAssessmentHandler,
  updateAssessmentHandler,
  getPeerFeedbacksHandler,
  getPeerFeedbackHandler,
} from "./controller"

router.get("/teams/:teamId/teammates", getTeammatesHandler)
router.post("/", createAssessmentHandler)
router.get("/", getAssessmentHandler)
router.put("/:id", updateAssessmentHandler)
router.get("/", getPeerFeedbacksHandler); // Get all peer feedbacks for a student
router.get("/:id", getPeerFeedbackHandler); // Get a specific peer feedback by ID

export default router
