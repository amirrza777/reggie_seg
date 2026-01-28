import { apiFetch } from "@/shared/api/http";
import type { FeedbackSubmission } from "../types";

export async function submitFeedback(payload: FeedbackSubmission) {
  return apiFetch("/peer-feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPeerFeedback(feedbackId: string) {
  return apiFetch<FeedbackSubmission>(`/peer-feedback/${feedbackId}`);
} 
