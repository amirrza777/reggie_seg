import { redirect } from "next/navigation";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getProjectNavFlags } from "@/features/projects/navFlags";
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
  const numericProjectId = Number(projectId);
  const flagMap = await getFeatureFlagMap();
  if (!flagMap["peer_feedback"]) redirect(`/projects/${projectId}`);

  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, numericProjectId);
  if (!user) {
    return (
      <div className="stack stack--tabbed">
        <ProjectNav projectId={projectId} enabledFlags={navFlags} />
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
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
      <PageSection
        title="Peer Feedback"
        description="Collect and review peer feedback for this project."
      >
        <FeedbackAssessmentView feedbacks={feedbacks} projectId={projectId} />
      </PageSection>
    </div>
  );
}
