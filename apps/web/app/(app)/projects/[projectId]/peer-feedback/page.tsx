import { redirect } from "next/navigation";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import {
  getFeedbackReview,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import { FeedbackAssessmentView } from "@/features/peerFeedback/components/FeedbackListView";
import { getCurrentUser } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import { PageSection } from "@/shared/ui/PageSection";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const flagMap = await getFeatureFlagMap();
  if (!flagMap["peer_feedback"]) redirect(`/projects/${projectId}`);

  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <ProjectNav projectId={projectId} />
        <PageSection
          title="Peer Feedback"
          description="Collect and review peer feedback for this project."
        >
          <p className="muted">Please sign in to view peer feedback.</p>
        </PageSection>
      </div>
    );
  }

  const feedbacksRaw = await getPeerAssessmentsForUser(String(user.id), projectId);
  const feedbacks = await Promise.all(
    feedbacksRaw.map(async (feedback) => {
      try {
        await getFeedbackReview(String(feedback.id));
        return { ...feedback, reviewSubmitted: true };
      } catch {
        return { ...feedback, reviewSubmitted: false };
      }
    })
  );

  return (
    <div>
      <ProjectNav projectId={projectId} />
      <PageSection
        title="Peer Feedback"
        description="Collect and review peer feedback for this project."
      >
        <FeedbackAssessmentView feedbacks={feedbacks} projectId={projectId} />
      </PageSection>
    </div>
  );
}
