import {
  upsertPeerFeedback,
  getPeerFeedbackByAssessmentId,
  getPeerFeedbackByAssessmentIds,
  getPeerAssessmentById,
  listPeerFeedbackReviewsByPeerAssessmentIds,
} from "./repo.js";
import { fetchProjectDeadline } from "../projects/service.js";
import { prisma } from "../../shared/db.js";
import { getModuleDetailsIfAuthorised } from "../peerAssessment/staff/repo.js";

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

const MAX_PEER_ASSESSMENT_IDS_PER_BULK_REVIEWS = 100;

/** Bulk-load feedback reviews for peer assessments the viewer may read (participant or staff on the module). */
export async function getFeedbackReviewsForViewer(
  viewerUserId: number,
  peerAssessmentIds: number[],
): Promise<Record<string, { reviewText: string | null; agreementsJson: unknown }>> {
  const deduped = [...new Set(peerAssessmentIds)].slice(0, MAX_PEER_ASSESSMENT_IDS_PER_BULK_REVIEWS);
  if (deduped.length === 0) {
    return {};
  }

  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { id: true, role: true, enterpriseId: true, active: true },
  });
  if (!viewer?.active) {
    return {};
  }

  const assessments = await prisma.peerAssessment.findMany({
    where: { id: { in: deduped } },
    select: {
      id: true,
      reviewerUserId: true,
      revieweeUserId: true,
      project: { select: { moduleId: true, module: { select: { enterpriseId: true } } } },
    },
  });

  const moduleAccessCache = new Map<number, boolean>();
  const canAccessModule = async (moduleId: number) => {
    if (moduleAccessCache.has(moduleId)) {
      return moduleAccessCache.get(moduleId)!;
    }
    const row = await getModuleDetailsIfAuthorised(moduleId, viewerUserId);
    const allowed = row != null;
    moduleAccessCache.set(moduleId, allowed);
    return allowed;
  };

  const allowedAssessmentIds: number[] = [];
  for (const a of assessments) {
    if (a.reviewerUserId === viewerUserId || a.revieweeUserId === viewerUserId) {
      allowedAssessmentIds.push(a.id);
      continue;
    }
    if (viewer.role === "ADMIN" || viewer.role === "ENTERPRISE_ADMIN") {
      if (a.project.module.enterpriseId === viewer.enterpriseId) {
        allowedAssessmentIds.push(a.id);
      }
      continue;
    }
    if (await canAccessModule(a.project.moduleId)) {
      allowedAssessmentIds.push(a.id);
    }
  }

  if (allowedAssessmentIds.length === 0) {
    return {};
  }

  const rows = await listPeerFeedbackReviewsByPeerAssessmentIds(allowedAssessmentIds);
  return Object.fromEntries(
    rows.map((r) => [
      String(r.peerAssessmentId),
      { reviewText: r.reviewText ?? null, agreementsJson: r.agreementsJson },
    ]),
  );
}
