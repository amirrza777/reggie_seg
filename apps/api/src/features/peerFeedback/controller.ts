import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  getFeedbackReview,
  getFeedbackReviewStatuses,
  getFeedbackReviewsForViewer,
  saveFeedbackReview,
  getPeerAssessment,
} from "./service.js";
import {
  parseCreatePeerFeedbackBody,
  parseFeedbackIdParam,
  parseFeedbackStatusesBody,
  parsePeerAssessmentReviewsBody,
} from "./controller.parsers.js";

/** Handles requests for create peer feedback. */
export async function createPeerFeedbackHandler(req: Request, res: Response) {
  const feedbackId = parseFeedbackIdParam(req.params.feedbackId);
  if (!feedbackId.ok) return res.status(400).json({ error: feedbackId.error });
  const parsedBody = parseCreatePeerFeedbackBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const saved = await saveFeedbackReview(feedbackId.value, parsedBody.value);
    res.json({ ok: true, saved });
  } catch (error: any) {
    if (error?.code === "PEER_ASSESSMENT_NOT_FOUND") {
      return res.status(404).json({ error: "Peer assessment not found" });
    }
    if (error?.code === "INVALID_REVIEWER" || error?.code === "INVALID_REVIEWEE") {
      return res.status(400).json({ error: error?.message ?? "Invalid reviewer/reviewee id" });
    }
    if (error?.code === "FEEDBACK_WINDOW_NOT_OPEN" || error?.code === "FEEDBACK_DEADLINE_PASSED") {
      return res.status(409).json({ error: error?.message ?? "Peer feedback is outside the allowed deadline window" });
    }
    console.error("Error saving feedback review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get peer feedback. */
export async function getPeerFeedbackHandler(req: Request, res: Response) {
  const feedbackId = parseFeedbackIdParam(req.params.feedbackId);
  if (!feedbackId.ok) return res.status(400).json({ error: feedbackId.error });
  try {
    const review = await getFeedbackReview(feedbackId.value);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (error) {
    console.error("Error retrieving feedback review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPeerFeedbackReviewsByAssessmentsHandler(req: AuthRequest, res: Response) {
  const viewerId = Number(req.user?.sub);
  if (!Number.isInteger(viewerId) || viewerId <= 0) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const parsedBody = parsePeerAssessmentReviewsBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const reviews = await getFeedbackReviewsForViewer(viewerId, parsedBody.value.peerAssessmentIds);
    return res.json({ reviews });
  } catch (error) {
    console.error("Error retrieving peer feedback reviews by assessments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for bulk peer feedback completion statuses. */
export async function getPeerFeedbackStatusesHandler(req: Request, res: Response) {
  const parsedBody = parseFeedbackStatusesBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const statuses = await getFeedbackReviewStatuses(parsedBody.value.feedbackIds);
    return res.json({ statuses });
  } catch (error) {
    console.error("Error retrieving peer feedback statuses:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get peer assessment. */
export async function getPeerAssessmentHandler(req: Request, res: Response) {
  const feedbackId = parseFeedbackIdParam(req.params.feedbackId);
  if (!feedbackId.ok) return res.status(400).json({ error: feedbackId.error });
  try {
    const assessment = await getPeerAssessment(feedbackId.value);
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    res.json(assessment);
  } catch (err) {
    console.error("Error fetching assessment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
