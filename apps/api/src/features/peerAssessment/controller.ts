import type { Request, Response } from "express"
import { fetchTeammates, saveAssessment, fetchAssessment, updateAssessmentAnswers, saveFeedbackReview } from "./service.js"
import { PeerAssessmentService } from "./services/PeerAssessmentService.js" 
const peerService = new PeerAssessmentService();

export async function getTeammatesHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId)
  const teamId = Number(req.params.teamId)

  if (isNaN(userId) || isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid user ID or team ID" })
  }

  try {
    const teammates = await fetchTeammates(userId, teamId)
    res.json(teammates)
  } catch (error) {
    console.error("Error fetching teammates:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export async function createAssessmentHandler(req: Request, res: Response) {
  const {
    moduleId,
    projectId,
    teamId,
    reviewerUserId,
    revieweeUserId,
    templateId,
    answersJson
  } = req.body

  if (!moduleId || !teamId || !reviewerUserId || !revieweeUserId || !templateId || !answersJson) {
    return res.status(400).json({ error: "Invalid request body" })
  }

  try {
    const assessment = await saveAssessment({
      moduleId,
      projectId: projectId || null,
      teamId,
      reviewerUserId,
      revieweeUserId,
      templateId,
      answersJson
    })
    res.json({ ok: true, assessmentId: assessment.id })
  } catch (error) {
    console.error("Error creating peer assessment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export async function getAssessmentHandler(req: Request, res: Response) {
  const moduleId = Number(req.query.moduleId)
  const projectId = Number(req.query.projectId)
  const teamId = Number(req.query.teamId)
  const reviewerId = Number(req.query.reviewerId)
  const revieweeId = Number(req.query.revieweeId)

  if (isNaN(moduleId) || isNaN(teamId) || isNaN(reviewerId) || isNaN(revieweeId)) {
    return res.status(400).json({ error: "Invalid query parameters" })
  }

  try {
    const assessment = await fetchAssessment(moduleId, projectId, teamId, reviewerId, revieweeId)

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" })
    }

    res.json(assessment)
  } catch (error) {
    console.error("Error fetching assessment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export async function updateAssessmentHandler(req: Request, res: Response) {
  const assessmentId = Number(req.params.id)
  const { answersJson } = req.body

  if (isNaN(assessmentId)) {
    return res.status(400).json({ error: "Invalid assessment ID" })
  }

  if (!answersJson) {
    return res.status(400).json({ error: "Invalid request body" })
  }

  try {
    await updateAssessmentAnswers(assessmentId, answersJson)
    res.json({ ok: true })
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Peer assessment not found" })
    }
    console.error("Error updating peer assessment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export async function getAssessmentsHandler(req: Request, res: Response) {
  const userId = Number(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const feedbacks = await peerService.getFeedbackForStudent(userId);
    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching peer feedbacks:", error);
    res.status(500).json({ error: "Internal server error" });
  }   
}

export async function getAssessmentByIdHandler(req: Request, res: Response) {
  const feedbackId = Number(req.params.feedbackId);

  if (isNaN(feedbackId)) {
    return res.status(400).json({ error: "Invalid feedback ID" });
  }
  
  try {
    const feedback = await peerService.getFeedbackById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }
    res.json(feedback);
  } catch (error) {
    console.error("Error fetching peer feedback:", error);
    res.status(500).json({ error: "Internal server error" });   
  }   
}

export async function createFeedbackReviewHandler(req: Request, res: Response) {
  const feedbackId = Number(req.params.feedbackId);
  const { reviewText, agreements } = req.body;

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
    const saved = saveFeedbackReview(feedbackId, { reviewText: reviewText || '', agreements });
    res.json({ ok: true, saved });
  } catch (error) {
    console.error("Error saving feedback review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFeedbackReviewHandler(req: Request, res: Response) {
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
