import type { PeerFeedback , Answer} from "@/features/peerFeedback/types";
import { FeedbackReviewForm } from "@/features/peerFeedback/components/FeedbackReviewForm";
import { getPeerFeedbackById, getFeedbackReview } from "@/features/peerFeedback/api/client";

type ProjectPageProps = {
  params: Promise<{
    feedbackId: string;
    projectId: string;
  }>;
};

export default async function PeerFeedbackReview({ params }: ProjectPageProps) {
  const { feedbackId, projectId } = await params;
  const feedback: PeerFeedback = await getPeerFeedbackById(feedbackId);
  let existingReview: any = null;
  try {
    existingReview = await getFeedbackReview(feedbackId);
  } catch (err) {
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
        <FeedbackReviewForm feedback={feedback} currentUserId="3" />
      )}
    </div>
  );
}
