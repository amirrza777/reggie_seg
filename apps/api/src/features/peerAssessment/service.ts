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

export function fetchTeammates(userId: number, teamId: number) {
  return getTeammates(userId, teamId)
}

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

export function fetchAssessment(
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  return getPeerAssessment(projectId, teamId, reviewerId, revieweeId)
}

export function updateAssessmentAnswers(assessmentId: number, answersJson: any) {
  return updatePeerAssessment(assessmentId, answersJson)
}

export function fetchTeammateAssessments(userId: number, projectId: number) {
  return getTeammateAssessments(userId, projectId)
}

export function fetchQuestionsForProject(projectId: number) {
  return getQuestionsForProject(projectId);
}

export function fetchAssessmentById(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}

export function fetchProjectQuestionnaireTemplate(projectId: number) {
  return getProjectQuestionnaireTemplate(projectId);
}

