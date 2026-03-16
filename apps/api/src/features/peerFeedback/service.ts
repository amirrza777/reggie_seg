import { upsertPeerFeedback, getPeerFeedbackByAssessmentId, getPeerAssessmentById } from "./repo.js";

/** Saves the feedback review. */
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

/** Returns the feedback review. */
export function getFeedbackReview(assessmentId: number) {
  return getPeerFeedbackByAssessmentId(assessmentId);
}

/** Returns the peer assessment. */
export function getPeerAssessment(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}
