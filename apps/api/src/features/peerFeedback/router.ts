import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import type { AuthRequest } from "../../auth/middleware.js";
import { isFeatureEnabledForUser } from "../featureFlags/service.js";
import {
  createPeerFeedbackHandler,
  getPeerFeedbackReviewsByAssessmentsHandler,
  getPeerFeedbackStatusesHandler,
  getPeerFeedbackHandler,
  getPeerAssessmentHandler,
} from "./controller.js";

const router = Router();
router.use(requireAuth);

router.use(async (req: AuthRequest, res, next) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const enabled = await isFeatureEnabledForUser("peer_feedback", userId);
  if (!enabled) return res.status(403).json({ error: "Peer feedback is disabled" });
  return next();
});

router.post("/feedback/reviews/by-assessments", getPeerFeedbackReviewsByAssessmentsHandler);
router.post("/feedback/reviews/statuses", getPeerFeedbackStatusesHandler); // Get review-status map in bulk
router.post("/feedback/:feedbackId/review", createPeerFeedbackHandler); // Submit a peerfeedback
router.get("/feedback/:feedbackId/review", getPeerFeedbackHandler); // Get stored peer feedback
router.get("/feedback/:feedbackId", getPeerAssessmentHandler); // Get the original assessment/feedback details

export default router
