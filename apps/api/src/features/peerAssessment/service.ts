import {
  getTeammates,
  createPeerAssessment,
  getPeerAssessment,
  updatePeerAssessment,
  createPeerAssessmentReview,
  getPeerAssessmentReviewByAssessmentId,
} from "./repo.js"

export function fetchTeammates(userId: number, teamId: number) {
  return getTeammates(userId, teamId)
}

export function saveAssessment(data: {
  moduleId: number
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
  moduleId: number,
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  return getPeerAssessment(moduleId, projectId, teamId, reviewerId, revieweeId)
}

export function updateAssessmentAnswers(assessmentId: number, answersJson: any) {
  return updatePeerAssessment(assessmentId, answersJson)
}

export async function saveFeedbackReview(assessmentId: number, payload: { reviewText: string; agreements: any }) {
  const created = await createPeerAssessmentReview({
    peerAssessmentId: assessmentId,
    reviewText: payload.reviewText,
    agreementsJson: payload.agreements,
  });
  return created;
}

export function getFeedbackReview(assessmentId: number) {
  return getPeerAssessmentReviewByAssessmentId(assessmentId);
}
