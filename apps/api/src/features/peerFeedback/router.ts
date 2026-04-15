import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  createPeerFeedbackHandler,
  getPeerFeedbackReviewsByAssessmentsHandler,
  getPeerFeedbackStatusesHandler,
  getPeerFeedbackHandler,
  getPeerAssessmentHandler,
} from "./controller.js";

const router = Router();
router.use(requireAuth);

router.post("/feedback/reviews/by-assessments", getPeerFeedbackReviewsByAssessmentsHandler);
router.post("/feedback/reviews/statuses", getPeerFeedbackStatusesHandler); // Get review-status map in bulk
router.post("/feedback/:feedbackId/review", createPeerFeedbackHandler); // Submit a peerfeedback
router.get("/feedback/:feedbackId/review", getPeerFeedbackHandler); // Get stored peer feedback
router.get("/feedback/:feedbackId", getPeerAssessmentHandler); // Get the original assessment/feedback details

export default router
