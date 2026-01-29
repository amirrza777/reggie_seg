import {
  getTeammates,
  createPeerAssessment,
  getPeerAssessment,
  updatePeerAssessment
} from "./repo.js"

export function fetchTeammates(userId: number, teamId: number) {
  return getTeammates(userId, teamId)
}

export function saveAssessment(data: {
  moduleId: number
  projectId: number | null
  teamId: number
  reviewerUserId: number
  revieweeUserId: number
  templateId: number
  answersJson: any
}) {
  return createPeerAssessment(data)
}

export function fetchAssessment(
  moduleId: number,
  projectId: number | null,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  return getPeerAssessment(moduleId, projectId, teamId, reviewerId, revieweeId)
}

export function updateAssessmentAnswers(assessmentId: number, answersJson: any) {
  return updatePeerAssessment(assessmentId, answersJson)
}
