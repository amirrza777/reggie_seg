import type { PeerFeedback } from "@/features/peerFeedback/types";
import { FeedbackReviewForm } from "@/features/peerFeedback/components/FeedbackReviewForm";
import { getPeerFeedbackById, getFeedbackReview } from "@/features/peerFeedback/api/client";
import { a } from "vitest/dist/chunks/suite.B2jumIFP";

type ProjectPageProps = {
  params: {
    feedbackId: string;
    projectId: string;
  };
};

export default async function PeerFeedbackReview(props : ProjectPageProps) {
  const params = await props.params;
  const { feedbackId , projectId } = params;
  const feedback: PeerFeedback = await getPeerFeedbackById(feedbackId);
  let existingReview: Awaited<ReturnType<typeof getFeedbackReview>> | null = null;
  try {
    existingReview = await getFeedbackReview(feedbackId);
  } catch {
    existingReview = null;
  }

  return (
    <div>
      {existingReview ? (
        <FeedbackReviewForm
          feedback={feedback}
          initialReview={existingReview.reviewText ?? ""}
          initialAgreements={existingReview.agreementsJson ?? null}
          currentUserId="3"
        />
      ) : (
        <FeedbackReviewForm feedback={feedback} currentUserId="2" />
      )}
    </div>
  );
}
