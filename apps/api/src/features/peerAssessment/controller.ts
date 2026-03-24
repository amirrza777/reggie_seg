import type { Request, Response } from "express"
import { fetchTeammates, saveAssessment, fetchAssessment, updateAssessmentAnswers, fetchTeammateAssessments , fetchQuestionsForProject, fetchAssessmentById, fetchProjectQuestionnaireTemplate } from "./service.js"
import { PeerAssessmentService } from "./services/PeerAssessmentService.js" 
import { AssessmentAnswerValidationError, normalizeAndValidateAssessmentAnswers } from "./answers.js";
import {
  parseAssessmentAnswersBody,
  parseAssessmentIdParam,
  parseAssessmentQuery,
  parseCreateAssessmentBody,
  parseProjectIdParam,
  parseUserIdAndProjectIdParams,
  parseUserIdAndTeamIdQuery,
} from "./controller.parsers.js";
const peerService = new PeerAssessmentService();

/** Handles requests for get teammates. */
export async function getTeammatesHandler(req: Request, res: Response) {
  const parsed = parseUserIdAndTeamIdQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })

  try {
    const teammates = await fetchTeammates(parsed.value.userId, parsed.value.teamId)
    res.json(teammates)
  } catch (error) {
    console.error("Error fetching teammates:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

/** Handles requests for create assessment. */
export async function createAssessmentHandler(req: Request, res: Response) {
  const parsedBody = parseCreateAssessmentBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error })

  try {
    const project = await fetchProjectQuestionnaireTemplate(parsedBody.value.projectId);
    if (!project || !project.questionnaireTemplate) {
      return res.status(404).json({ error: "Questionnaire template not found for this project" });
    }
    if (project.questionnaireTemplate.id !== parsedBody.value.templateId) {
      return res.status(400).json({
        error: "templateId does not match the project's questionnaire template",
      });
    }

    const normalizedAnswers = normalizeAndValidateAssessmentAnswers(
      parsedBody.value.answersJson,
      project.questionnaireTemplate.questions
    );

    const assessment = await saveAssessment({
      projectId: parsedBody.value.projectId,
      teamId: parsedBody.value.teamId,
      reviewerUserId: parsedBody.value.reviewerUserId,
      revieweeUserId: parsedBody.value.revieweeUserId,
      templateId: parsedBody.value.templateId,
      answersJson: normalizedAnswers,
    });

    res.json({ ok: true, assessmentId: assessment.id });
  } catch (error: any) {
    if (error instanceof AssessmentAnswerValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.code === "PROJECT_ARCHIVED") {
      return res.status(409).json({ error: "This project is archived and cannot accept new assessments" });
    }
    if (error?.code === "ASSESSMENT_WINDOW_NOT_OPEN" || error?.code === "ASSESSMENT_DEADLINE_PASSED") {
      return res.status(409).json({
        error: error?.message ?? "Peer assessment is outside the allowed deadline window",
      });
    }
    console.error("Error creating peer assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get assessment. */
export async function getAssessmentHandler(req: Request, res: Response) {
  const parsed = parseAssessmentQuery(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })

  try {
    const assessment = await fetchAssessment(parsed.value.projectId, parsed.value.teamId, parsed.value.reviewerId, parsed.value.revieweeId)

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" })
    }

    res.json(assessment)
  } catch (error) {
    console.error("Error fetching assessment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

/** Handles requests for update assessment. */
export async function updateAssessmentHandler(req: Request, res: Response) {
  const assessmentId = parseAssessmentIdParam(req.params.id)
  if (!assessmentId.ok) return res.status(400).json({ error: assessmentId.error })
  const parsedBody = parseAssessmentAnswersBody(req.body)
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error })

  try {
    const existingAssessment = await fetchAssessmentById(assessmentId.value);
    if (!existingAssessment) {
      return res.status(404).json({ error: "Peer assessment not found" });
    }

    const templateQuestions = existingAssessment.questionnaireTemplate?.questions ?? [];
    const normalizedAnswers = normalizeAndValidateAssessmentAnswers(parsedBody.value.answersJson, templateQuestions);
    await updateAssessmentAnswers(assessmentId.value, normalizedAnswers)
    res.json({ ok: true })
  } catch (error: any) {
    if (error instanceof AssessmentAnswerValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Peer assessment not found" })
    }
    if (error?.code === "ASSESSMENT_WINDOW_NOT_OPEN" || error?.code === "ASSESSMENT_DEADLINE_PASSED") {
      return res.status(409).json({ error: error?.message ?? "Peer assessment is outside the allowed deadline window" })
    }
    console.error("Error updating peer assessment:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

/** Handles requests for get assessments. */
export async function getAssessmentsHandler(req: Request, res: Response) {
  const parsed = parseUserIdAndProjectIdParams(req as any);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const assessments = await fetchTeammateAssessments(parsed.value.userId, parsed.value.projectId);
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching peer assessments:", error);
    res.status(500).json({ error: "Internal server error" });
  }   
}

/** Handles requests for get assessment by ID. */
export async function getAssessmentByIdHandler(req: Request, res: Response) {
  const assessmentId = parseAssessmentIdParam(req.params.id);
  if (!assessmentId.ok) return res.status(400).json({ error: assessmentId.error });
  
  try {
    const assessment = await fetchAssessmentById(assessmentId.value);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    res.json(assessment);
  } catch (error) {
    console.error("Error fetching peer assessment:", error);
    res.status(500).json({ error: "Internal server error" });   
  }   
}

/** Handles requests for get questions for project. */
export async function getQuestionsForProjectHandler(req: Request, res: Response) {
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const project = await fetchQuestionsForProject(projectId.value);
    if (!project || !project.questionnaireTemplate) {
      return res.status(404).json({ error: "Questionnaire template not found for this project" });
    }
    res.json(project.questionnaireTemplate);
  } catch (error) {
    console.error("Error fetching questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get project questionnaire template. */
export async function getProjectQuestionnaireTemplateHandler(req: Request, res: Response) {
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const project = await fetchProjectQuestionnaireTemplate(projectId.value);
    if (!project || !project.questionnaireTemplate) {
      return res.status(404).json({ error: "Questionnaire template not found for this project" });
    }
    res.json(project.questionnaireTemplate);
  } catch (error) {
    console.error("Error fetching project questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
