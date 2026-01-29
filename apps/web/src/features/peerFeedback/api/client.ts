import { apiFetch } from "@/shared/api/http";
import type { FeedbackSubmission } from "../types";
import { mapApiAssessmentToPeerFeedback, mapApiAssessmentsToPeerFeedbacks } from "./mapper";

export async function submitFeedback(payload: FeedbackSubmission) {
  return apiFetch("/peer-feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPeerFeedbackById(feedbackId: string) {
  const raw = await apiFetch(`/peer-assessments/feedback/${feedbackId}`);
  return mapApiAssessmentToPeerFeedback(raw);
} 

export async function getPeerFeedbacksForUser(userId: string) {
  const raw = await apiFetch<FeedbackSubmission>(`/peer-assessments/user/${userId}`);
  return mapApiAssessmentsToPeerFeedbacks(raw);
} 
