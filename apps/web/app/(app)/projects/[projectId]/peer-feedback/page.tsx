import {
  getFeedbackReviewStatuses,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import { FeedbackAssessmentView } from "@/features/peerFeedback/components/FeedbackListView";
import { getCurrentUser } from "@/shared/auth/session";
import { getProjectDeadline } from "@/features/projects/api/client";
import { PageSection } from "@/shared/ui/PageSection";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageSection
        title="Peer Feedback"
        description="Collect and review peer feedback for this project."
      >
        <p className="muted">Please sign in to view peer feedback.</p>
      </PageSection>
    );
  }

  let readOnly = false;
  try {
    const deadline = await getProjectDeadline(user.id, Number(projectId));
    const dueAt = deadline.feedbackDueDate ? new Date(deadline.feedbackDueDate) : null;
    const now = new Date();
    readOnly = Boolean(dueAt && !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now.getTime());
  } catch {
    readOnly = false;
  }

  const feedbacksRaw = await getPeerAssessmentsForUser(String(user.id), projectId);
  const reviewStatuses = await getFeedbackReviewStatuses(feedbacksRaw.map((feedback) => String(feedback.id)));
  const feedbacks = feedbacksRaw.map((feedback) => ({
    ...feedback,
    reviewSubmitted: reviewStatuses[String(feedback.id)] === true,
  }));

  return (
    <PageSection
      title="Peer Feedback"
      description="Collect and review peer feedback for this project."
    >
      <FeedbackAssessmentView feedbacks={feedbacks} projectId={projectId} readOnly={readOnly} />
    </PageSection>
  );
}
