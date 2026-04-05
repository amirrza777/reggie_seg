import { apiFetch } from "@/shared/api/http";
import type { FeedbackSubmission, PeerAssessmentReviewPayload, PeerFeedbackReview } from "../types";
import {
  mapApiAssessmentToPeerFeedback,
  mapApiAssessmentsToPeerFeedbacks,
  mapApiAssessmentsToPeerFeedbacksReceived,
} from "./mapper";

const AGREEMENT_SCORES = {
  "Strongly Disagree": 1,
  Disagree: 2,
  Reasonable: 3,
  Agree: 4,
  "Strongly Agree": 5,
} as const;

type AgreementLabel = keyof typeof AGREEMENT_SCORES;

function isAgreementLabel(value: unknown): value is AgreementLabel {
  return typeof value === "string" && value in AGREEMENT_SCORES;
}

function labelFromScore(score: number): AgreementLabel {
  if (score <= 1) return "Strongly Disagree";
  if (score === 2) return "Disagree";
  if (score === 3) return "Reasonable";
  if (score === 4) return "Agree";
  return "Strongly Agree";
}

function normalizeAgreementsJson(input: unknown): PeerFeedbackReview["agreementsJson"] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const source = input as Record<string, unknown>;
  const normalized = Object.fromEntries(
    Object.entries(source).map(([key, rawValue]) => {
      if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
        return [key, { selected: "Reasonable", score: 3 }];
      }

      const value = rawValue as Record<string, unknown>;
      const rawScore = typeof value.score === "number" && Number.isFinite(value.score) ? value.score : null;
      const safeScore = rawScore == null ? 3 : Math.min(5, Math.max(1, Math.round(rawScore)));
      const selected = isAgreementLabel(value.selected) ? value.selected : labelFromScore(safeScore);
      const score = typeof value.score === "number" && Number.isFinite(value.score) ? safeScore : AGREEMENT_SCORES[selected];

      return [key, { selected, score }];
    })
  );

  return normalized;
}

export async function submitFeedback(payload: FeedbackSubmission) {
  // creating an assessment still goes to the peer-assessments endpoint
  return apiFetch("/peer-assessments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPeerFeedbackById(feedbackId: string) {
  // fetch the peer feedback 
  const raw = await apiFetch(`/peer-feedback/feedback/${feedbackId}`);
  return mapApiAssessmentToPeerFeedback(raw);
}

export async function getPeerAssessmentsForUser(userId: string, projectId: string) {
  const raw = await apiFetch<FeedbackSubmission>(`/peer-assessments/projects/${projectId}/user/${userId}`);
  return mapApiAssessmentsToPeerFeedbacks(raw);
}

export async function getPeerAssessmentsReceivedForUser(userId: string, projectId: string) {
  const raw = await apiFetch<FeedbackSubmission>(`/peer-assessments/projects/${projectId}/reviewee/${userId}`);
  return mapApiAssessmentsToPeerFeedbacksReceived(raw);
}

export async function getFeedbackReview(feedbackId: string) {
  // fetch stored review (if any)
  const review = await apiFetch<PeerFeedbackReview>(`/peer-feedback/feedback/${feedbackId}/review`);
  return {
    ...review,
    agreementsJson: normalizeAgreementsJson(review?.agreementsJson),
  };
}

export async function getFeedbackReviewStatuses(feedbackIds: string[]) {
  if (feedbackIds.length === 0) return {};

  const response = await apiFetch<{ statuses: Record<string, boolean> }>(
    "/peer-feedback/feedback/reviews/statuses",
    {
      method: "POST",
      body: JSON.stringify({ feedbackIds }),
    }
  );
  return response.statuses ?? {};
}

export async function submitPeerFeedback(feedbackId: string, payload: PeerAssessmentReviewPayload, reviewerUserId: string, revieweeUserId: string) {
  // submit (create/update) a review for a peer-feedback
  const body = { ...payload, reviewerUserId, revieweeUserId};
  return apiFetch(`/peer-feedback/feedback/${feedbackId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
