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

export function saveAssessment(data: {
  projectId: number 
  teamId: number
  reviewerUserId: number
  revieweeUserId: number
  templateId: number
  answersJson: any
}) {
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

