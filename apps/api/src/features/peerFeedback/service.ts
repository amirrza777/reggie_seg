import { upsertPeerFeedback, getPeerFeedbackByAssessmentId, getPeerAssessmentById } from "./repo.js";
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
  if (dueAt && now > dueAt) {
    throw {
      code: "FEEDBACK_DEADLINE_PASSED",
      message: "Peer feedback deadline has passed for your deadline profile",
      dueAt,
    };
  }
}

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
  assertFeedbackWindowOpen(reviewerDeadline);

  const created = await upsertPeerFeedback({
    peerAssessmentId: assessmentId,
    reviewerUserId,
    revieweeUserId,
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
