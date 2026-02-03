"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import type { PeerFeedback, Answer, AgreementOption, AgreementsMap, PeerAssessmentReviewPayload } from "../types";
import { AGREEMENT_OPTIONS } from "../types";
import { submitPeerFeedback } from "../api/client";

type FeedbackReviewFormProps = {
  feedback: PeerFeedback;
  onSubmit?: (payload: PeerAssessmentReviewPayload) => Promise<void>;
  initialReview?: string | null;
  initialAgreements?: AgreementsMap | null;
  redirectTo?: "back" | string;
  currentUserId: string;
};

export function FeedbackReviewForm({ feedback, onSubmit, initialReview, initialAgreements, redirectTo = 'back', currentUserId }: FeedbackReviewFormProps) {
  const router = useRouter();
  const [review, setReview] = useState<string>(initialReview ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [agreements, setAgreements] = useState<AgreementsMap>(() => {
    return Object.fromEntries(
      (feedback.answers ?? []).map((a) => [
        a.id,
        initialAgreements?.[a.id] ?? {
          selected: "Reasonable",
          score: 3,
        },
      ])
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!review.trim()) {
      setMessage("Please provide a review before submitting.");
      return;
    }

    setMessage(null);
    setIsLoading(true);
    try {
      const payload: PeerAssessmentReviewPayload = {
        reviewText: review,
        agreements,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await submitPeerFeedback(String(feedback.id), payload, currentUserId, String(feedback.reviewerId));
      }

      setMessage("Peer feedback submitted successfully.");

      if (redirectTo === "back") {
        router.back();
      } else if (redirectTo) {
        router.push(redirectTo);
      } else if (feedback.projectId) {
        router.push(`/projects/${feedback.projectId}/peer-feedback`);
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to submit peer feedback"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="stack">
      <h3>Respond to Feedback</h3>
      <p className="muted">
        Share your thoughts about this feedback from {feedback.firstName} {feedback.lastName}
      </p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="stack" style={{ gap: 6 }}>
          <span>Your Review</span>
          <textarea rows={4} placeholder="Type your response here..." value={review} onChange={(e) => setReview(e.target.value)} disabled={isLoading}/>
        </label>

        <div style={{ marginTop: 8 }}>
          <h4 style={{ margin: 0 }}>Agree with each answer?</h4>
          <p className="muted">Select how much you agree or disagree with each provided answer.</p>
          <ul style={{ paddingLeft: 18, margin: '8px 0', display: 'grid', gap: 12 }}>
            {(feedback.answers || []).map((a: Answer) => (
              <li key={a.id} style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                <strong style={{ display: 'block' }}>{a.question}</strong>
                <p style={{ margin: '6px 0' }}>{a.answer}</p>
                <label style={{ display: 'block', gap: 8 }}>
                  <select
                    value={agreements[a.id]?.selected ?? 'Reasonable'}
                    onChange={(e) => {
                      const selected = e.target.value as AgreementOption;
                      const score = AGREEMENT_OPTIONS.find(o => o.label === selected)?.score ?? 3;
                      setAgreements((prev) => ({ ...prev, [a.id]: { selected, score } }));
                    }}
                    disabled={isLoading}
                  >
                    {AGREEMENT_OPTIONS.map((option) => (
                      <option key={option.label} value={option.label}>
                        {option.score} — {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit Review"}
        </Button>
        {message ? (
          <p className={message.includes("success") ? "" : "muted"}>
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

