import { prisma } from "../../shared/db.js";
import {
  getTeammates,
  createPeerAssessment,
  getPeerAssessment,
  updatePeerAssessment,
  getTeammateAssessments,
  getQuestionsForProject,
  getPeerAssessmentById,
  getProjectQuestionnaireTemplate,
} from "./repo.js"

/** Returns the teammates. */
export function fetchTeammates(userId: number, teamId: number) {
  return getTeammates(userId, teamId)
}

/** Saves the assessment. */
export async function saveAssessment(data: {
  projectId: number
  teamId: number
  reviewerUserId: number
  revieweeUserId: number
  templateId: number
  answersJson: any
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId }, select: { archivedAt: true } });
  if (project?.archivedAt) throw { code: "PROJECT_ARCHIVED" };
  return createPeerAssessment(data)
}

/** Returns the assessment. */
export function fetchAssessment(
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  return getPeerAssessment(projectId, teamId, reviewerId, revieweeId)
}

/** Updates the assessment answers. */
export function updateAssessmentAnswers(assessmentId: number, answersJson: any) {
  return updatePeerAssessment(assessmentId, answersJson)
}

/** Returns the teammate assessments. */
export function fetchTeammateAssessments(userId: number, projectId: number) {
  return getTeammateAssessments(userId, projectId)
}

/** Returns the questions for project. */
export function fetchQuestionsForProject(projectId: number) {
  return getQuestionsForProject(projectId);
}

/** Returns the assessment by ID. */
export function fetchAssessmentById(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}

/** Returns the project questionnaire template. */
export function fetchProjectQuestionnaireTemplate(projectId: number) {
  return getProjectQuestionnaireTemplate(projectId);
}

