import {
  upsertPeerFeedback,
  getPeerFeedbackByAssessmentId,
  getPeerFeedbackByAssessmentIds,
  getPeerAssessmentById,
} from "./repo.js";

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

export async function getFeedbackReviewStatuses(assessmentIds: number[]) {
  const reviews = await getPeerFeedbackByAssessmentIds(assessmentIds);
  const reviewedIds = new Set(reviews.map((review) => review.peerAssessmentId));
  return Object.fromEntries(assessmentIds.map((id) => [String(id), reviewedIds.has(id)]));
}

export function getPeerAssessment(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}
