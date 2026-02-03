import { Router } from "express";

const router = Router();

import {
  createPeerFeedbackHandler,
  getPeerFeedbackHandler,
  getPeerAssessmentHandler,
} from "./controller.js"

router.post("/feedback/:feedbackId/review", createPeerFeedbackHandler); // Submit a peerfeedback
router.get("/feedback/:feedbackId/review", getPeerFeedbackHandler); // Get stored peer feedback
router.get("/feedback/:feedbackId", getPeerAssessmentHandler); // Get the original assessment/feedback details

export default router
