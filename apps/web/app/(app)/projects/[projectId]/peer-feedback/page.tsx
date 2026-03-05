import { redirect } from "next/navigation";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import {
  getFeedbackReview,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import { FeedbackAssessmentView } from "@/features/peerFeedback/components/FeedbackListView";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import { PageSection } from "@/shared/ui/PageSection";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const feedbacksRaw = await getPeerAssessmentsForUser("4", projectId); //hardcoded user id for now
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

  const flagMap = await getFeatureFlagMap();
  if (!flagMap["peer_feedback"]) redirect(`/projects/${projectId}`);

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
