import type { Request, Response } from "express"
import { fetchTeammates, saveAssessment, fetchAssessment, updateAssessmentAnswers, fetchTeammateAssessments , fetchQuestionsForProject, fetchAssessmentById } from "./service.js"
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
  console.log("---- UPDATE ASSESSMENT ----");
  console.log("params.id:", req.params.id);
  console.log("parsed id:", assessmentId);
  console.log("body:", req.body);
  console.log("answersJson:", answersJson);
  console.log("---------------------------");

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
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const assessments = await fetchTeammateAssessments(userId, projectId);
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching peer assessments:", error);
    res.status(500).json({ error: "Internal server error" });
  }   
}

export async function getAssessmentByIdHandler(req: Request, res: Response) {
  const assessmentId = Number(req.params.id);

  if (isNaN(assessmentId)) {
    return res.status(400).json({ error: "Invalid assessment ID" });
  }
  
  try {
    const assessment = await fetchAssessmentById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    res.json(assessment);
  } catch (error) {
    console.error("Error fetching peer assessment:", error);
    res.status(500).json({ error: "Internal server error" });   
  }   
}

export async function getQuestionsForProjectHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const template = await fetchQuestionsForProject(projectId);
    if (!template) {
      return res.status(404).json({ error: "Questionnaire template not found for this project" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error fetching questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
