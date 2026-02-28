import { upsertPeerFeedback, getPeerFeedbackByAssessmentId, getPeerAssessmentById } from "./repo.js";

export async function saveFeedbackReview(
  assessmentId: number,
  payload: { reviewText: string; agreements: any; reviewerUserId: string, revieweeUserId: string},
) {
  const created = await upsertPeerFeedback({
    peerAssessmentId: assessmentId,
    reviewerUserId: Number(payload.reviewerUserId),
    revieweeUserId : Number(payload.revieweeUserId),
    reviewText: payload.reviewText,
    agreementsJson: payload.agreements,
  });
  return created;
}

export function getFeedbackReview(assessmentId: number) {
  return getPeerFeedbackByAssessmentId(assessmentId);
}

export function getPeerAssessment(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}
