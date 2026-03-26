import {
  getFeedbackReviewStatuses,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import { FeedbackAssessmentView } from "@/features/peerFeedback/components/FeedbackListView";
import { PeerFeedbackTitleWithInfo } from "@/features/peerFeedback/components/PeerFeedbackTitleWithInfo";
import { getCurrentUser } from "@/shared/auth/session";
import { getProjectDeadline } from "@/features/projects/api/client";
import { PageSection } from "@/shared/ui/PageSection";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

function formatDeadlineLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildFeedbackGuidance(
  feedbackDueDate: string | null | undefined,
  feedbackDueDateMcf: string | null | undefined,
): string {
  const dueLabel = formatDeadlineLabel(feedbackDueDate);
  const extensionDueLabel = formatDeadlineLabel(feedbackDueDateMcf);

  if (dueLabel && extensionDueLabel) {
    return `The deadline for responding to peer feedback is ${dueLabel}. If you are unable to meet this deadline for valid reasons, you may apply for an extension. Late submissions or feedback changes are accepted until ${extensionDueLabel}, but will be deemed late unless an extension is approved.`;
  }

  if (dueLabel) {
    return `The deadline for responding to peer feedback is ${dueLabel}. Please complete your reviews before the deadline.`;
  }

  return "Review and respond to feedback items in this list.";
}

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageSection
        title={<PeerFeedbackTitleWithInfo title="Peer Feedback" />}
        className="ui-page--project"
      >
        <p className="muted">Please sign in to view peer feedback.</p>
      </PageSection>
    );
  }

  const [deadline, feedbacksRaw] = await Promise.all([
    getProjectDeadline(user.id, Number(projectId)).catch(() => null),
    getPeerAssessmentsForUser(String(user.id), projectId),
  ]);
  const readOnly = (() => {
    if (!deadline?.feedbackDueDate) return false;
    const dueAt = new Date(deadline.feedbackDueDate);
    if (Number.isNaN(dueAt.getTime())) return false;
    return dueAt.getTime() < Date.now();
  })();
  const listDescription = buildFeedbackGuidance(
    deadline?.feedbackDueDate,
    deadline?.feedbackDueDateMcf ?? null,
  );
  const reviewStatuses = await getFeedbackReviewStatuses(feedbacksRaw.map((feedback) => String(feedback.id)));
  const feedbacks = feedbacksRaw.map((feedback) => ({
    ...feedback,
    reviewSubmitted: reviewStatuses[String(feedback.id)] === true,
  }));

  return (
    <PageSection
      title={<PeerFeedbackTitleWithInfo title="Peer Feedback" />}
      className="ui-page--project"
    >
      <FeedbackAssessmentView
        feedbacks={feedbacks}
        projectId={projectId}
        listTitle="List of peer feedback"
        listDescription={listDescription}
        readOnly={readOnly}
      />
    </PageSection>
  );
}
