import type { Request, Response } from "express"
import { saveFeedbackReview, getPeerAssessment } from "./service.js"

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
  } catch (error) {
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
    const review = await (await import("./service.js")).getFeedbackReview(feedbackId);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (error) {
    console.error("Error retrieving feedback review:", error);
    res.status(500).json({ error: "Internal server error" });
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

