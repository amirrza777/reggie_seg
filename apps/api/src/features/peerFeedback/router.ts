import { Router } from "express";
import { isFeatureEnabled } from "../featureFlags/service.js";

const router = Router();

import {
  createPeerFeedbackHandler,
  getPeerFeedbackHandler,
  getPeerAssessmentHandler,
} from "./controller.js"

router.use(async (_req, res, next) => {
  const enabled = await isFeatureEnabled("peer_feedback");
  if (!enabled) return res.status(403).json({ error: "Peer feedback is disabled" });
  return next();
});

router.post("/feedback/:feedbackId/review", createPeerFeedbackHandler); // Submit a peerfeedback
router.get("/feedback/:feedbackId/review", getPeerFeedbackHandler); // Get stored peer feedback
router.get("/feedback/:feedbackId", getPeerAssessmentHandler); // Get the original assessment/feedback details

export default router