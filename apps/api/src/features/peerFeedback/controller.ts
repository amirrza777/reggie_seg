import type { Request, Response } from "express"
import {
  getFeedbackReview,
  getFeedbackReviewStatuses,
  saveFeedbackReview,
  getPeerAssessment,
} from "./service.js"

export async function createPeerFeedbackHandler(req: Request, res: Response) {
  const feedbackId = Number(req.params.feedbackId);
  const { reviewText, agreements, reviewerUserId, revieweeUserId } = req.body;

  if (isNaN(feedbackId)) {
    return res.status(400).json({ error: "Invalid feedback ID" });
  }

  if (typeof agreements !== 'object' || !agreements) {
    return res.status(400).json({ error: "Invalid agreements object" });
  }

  const validOptions = ['Strongly Disagree', 'Disagree', 'Reasonable', 'Agree', 'Strongly Agree'];
  for (const [answerId, value] of Object.entries(agreements)) {
    if (typeof value !== 'object' || !value) {
      return res.status(400).json({ error: `Invalid agreement value for ${answerId}` });
    }
    const { selected, score } = value as any;
    if (!validOptions.includes(selected) || typeof score !== 'number' || score < 1 || score > 5) {
      return res.status(400).json({ error: `Invalid agreement option or score for ${answerId}` });
    }
  }

  try {
    const saved = await saveFeedbackReview(feedbackId, { reviewText: reviewText || '', agreements, reviewerUserId, revieweeUserId});
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

export async function getPeerFeedbackHandler(req: Request, res: Response) {
  const feedbackId = Number(req.params.feedbackId);
  if (isNaN(feedbackId)) {
    return res.status(400).json({ error: "Invalid feedback ID" });
  }
  try {
    const review = await getFeedbackReview(feedbackId);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (error) {
    console.error("Error retrieving feedback review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPeerFeedbackStatusesHandler(req: Request, res: Response) {
  const feedbackIdsRaw = (req.body as { feedbackIds?: unknown }).feedbackIds;
  if (!Array.isArray(feedbackIdsRaw)) {
    return res.status(400).json({ error: "feedbackIds must be an array" });
  }

  const parsedFeedbackIds = feedbackIdsRaw.map((value) => Number(value));
  if (parsedFeedbackIds.some((id) => Number.isNaN(id))) {
    return res.status(400).json({ error: "feedbackIds must contain only numeric IDs" });
  }

  try {
    const statuses = await getFeedbackReviewStatuses(parsedFeedbackIds);
    return res.json({ statuses });
  } catch (error) {
    console.error("Error retrieving feedback review statuses:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPeerAssessmentHandler(req: Request, res: Response) {
  const feedbackId = Number(req.params.feedbackId);
  if (isNaN(feedbackId)) return res.status(400).json({ error: "Invalid feedback ID" });
  try {
    const assessment = await getPeerAssessment(feedbackId);
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    res.json(assessment);
  } catch (err) {
    console.error("Error fetching assessment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
