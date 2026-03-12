import type { PeerFeedback } from "@/features/peerFeedback/types";
import { FeedbackReviewForm } from "@/features/peerFeedback/components/FeedbackReviewForm";
import { getPeerFeedbackById, getFeedbackReview } from "@/features/peerFeedback/api/client";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

type ProjectPageProps = {
  params: Promise<{
    feedbackId: string;
    projectId: string;
  }>;
};

export default async function PeerFeedbackReview(props : ProjectPageProps) {
  const params = await props.params;
  const { feedbackId, projectId } = params;
  const user = await getCurrentUser();
  const feedback: PeerFeedback = await getPeerFeedbackById(feedbackId);
  let existingReview: Awaited<ReturnType<typeof getFeedbackReview>> | null = null;
  let feedbackDeadline: string | null = null;
  try {
    existingReview = await getFeedbackReview(feedbackId);
  } catch {
    existingReview = null;
  }
  if (user?.id) {
    try {
      const deadline = await getProjectDeadline(user.id, Number(projectId));
      feedbackDeadline = deadline.feedbackDueDate;
    } catch {
      feedbackDeadline = null;
    }
  }
  const currentUserId = user ? String(user.id) : feedback.revieweeId;

  return (
    <div>
      {existingReview ? (
        <FeedbackReviewForm
          feedback={feedback}
          initialReview={existingReview.reviewText ?? ""}
          initialAgreements={existingReview.agreementsJson ?? null}
          currentUserId={currentUserId}
          feedbackDeadline={feedbackDeadline}
        />
      ) : (
        <FeedbackReviewForm feedback={feedback} currentUserId={currentUserId} feedbackDeadline={feedbackDeadline} />
      )}
    </div>
  );
}
