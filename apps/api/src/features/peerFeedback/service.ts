import {
  upsertPeerFeedback,
  getPeerFeedbackByAssessmentId,
  getPeerFeedbackByAssessmentIds,
  getPeerAssessmentById,
} from "./repo.js";
import { fetchProjectDeadline } from "../projects/service.js";

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function assertFeedbackWindowOpen(
  deadline: { feedbackOpenDate?: unknown; feedbackDueDate?: unknown } | null,
  now = new Date(),
) {
  if (!deadline) return;
  const openAt = asDate(deadline.feedbackOpenDate);
  const dueAt = asDate(deadline.feedbackDueDate);

  if (openAt && now < openAt) {
    throw {
      code: "FEEDBACK_WINDOW_NOT_OPEN",
      message: "Peer feedback is not open yet for your deadline profile",
      opensAt: openAt,
    };
  }
  return {
    isLate: Boolean(dueAt && now > dueAt),
    dueAt,
  };
}

/** Saves the feedback review. */
export async function saveFeedbackReview(
  assessmentId: number,
  payload: { reviewText: string; agreements: any; reviewerUserId: string | number; revieweeUserId: string | number },
) {
  const assessment = await getPeerAssessmentById(assessmentId);
  if (!assessment) {
    throw { code: "PEER_ASSESSMENT_NOT_FOUND", message: "Peer assessment not found" };
  }

  const reviewerUserId = Number(payload.reviewerUserId);
  const revieweeUserId = Number(payload.revieweeUserId);
  if (!Number.isInteger(reviewerUserId) || reviewerUserId <= 0) {
    throw { code: "INVALID_REVIEWER", message: "Invalid reviewer user id" };
  }
  if (!Number.isInteger(revieweeUserId) || revieweeUserId <= 0) {
    throw { code: "INVALID_REVIEWEE", message: "Invalid reviewee user id" };
  }

  const reviewerDeadline = await fetchProjectDeadline(reviewerUserId, assessment.projectId);
  const window = assertFeedbackWindowOpen(reviewerDeadline);

  const created = await upsertPeerFeedback({
    peerAssessmentId: assessmentId,
    reviewerUserId,
    revieweeUserId,
    reviewText: payload.reviewText,
    agreementsJson: payload.agreements,
    submittedLate: window?.isLate ?? false,
    effectiveDueDate: window?.dueAt ?? null,
  });
  return created;
}

/** Returns the feedback review. */
export function getFeedbackReview(assessmentId: number) {
  return getPeerFeedbackByAssessmentId(assessmentId);
}

/** Returns a boolean status map keyed by peer assessment id. */
export async function getFeedbackReviewStatuses(assessmentIds: number[]) {
  const existingReviews = await getPeerFeedbackByAssessmentIds(assessmentIds);
  const completedAssessmentIds = new Set(existingReviews.map((review) => review.peerAssessmentId));

  return Object.fromEntries(assessmentIds.map((assessmentId) => [String(assessmentId), completedAssessmentIds.has(assessmentId)]));
}

/** Returns the peer assessment. */
export function getPeerAssessment(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}
