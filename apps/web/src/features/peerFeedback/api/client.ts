import { apiFetch } from "@/shared/api/http";
import type { FeedbackSubmission } from "../types";

export async function submitFeedback(payload: FeedbackSubmission) {
  return apiFetch("/peer-feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPeerFeedbackById(feedbackId: string) {
  return apiFetch<FeedbackSubmission>(`/peer-assessments/feedback/${feedbackId}`);
} 

export async function getPeerFeedbacksForUser(userId: string) {
  return apiFetch<FeedbackSubmission>(`/peer-assessments/user/${userId}`);
} 
