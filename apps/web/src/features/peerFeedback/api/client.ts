import { apiFetch } from "@/shared/api/http";
import type { FeedbackSubmission, PeerAssessmentReviewPayload } from "../types";
import { mapApiAssessmentToPeerFeedback, mapApiAssessmentsToPeerFeedbacks } from "./mapper";

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

export async function getFeedbackReview(feedbackId: string) {
  // fetch stored review (if any)
  return apiFetch(`/peer-feedback/feedback/${feedbackId}/review`);
}

export async function submitPeerFeedback(feedbackId: string, payload: PeerAssessmentReviewPayload, reviewerUserId: string, revieweeUserId: string) {
  // submit (create/update) a review for a peer-feedback
  const body = { ...payload, reviewerUserId, revieweeUserId};
  return apiFetch(`/peer-feedback/feedback/${feedbackId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
