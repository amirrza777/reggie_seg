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
        className="ui-page--project"
      >
        <p className="muted">Please sign in to view peer feedback.</p>
      </PageSection>
    );
  }

  const [readOnly, feedbacksRaw] = await Promise.all([
    getProjectDeadline(user.id, Number(projectId))
      .then((deadline) => {
        const dueAt = deadline.feedbackDueDate ? new Date(deadline.feedbackDueDate) : null;
        const now = new Date();
        return Boolean(dueAt && !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now.getTime());
      })
      .catch(() => false),
    getPeerAssessmentsForUser(String(user.id), projectId),
  ]);
  const reviewStatuses = await getFeedbackReviewStatuses(feedbacksRaw.map((feedback) => String(feedback.id)));
  const feedbacks = feedbacksRaw.map((feedback) => ({
    ...feedback,
    reviewSubmitted: reviewStatuses[String(feedback.id)] === true,
  }));

  return (
    <PageSection
      title="Peer Feedback"
      description="Collect and review peer feedback for this project."
      className="ui-page--project"
    >
      <FeedbackAssessmentView feedbacks={feedbacks} projectId={projectId} readOnly={readOnly} />
    </PageSection>
  );
}
