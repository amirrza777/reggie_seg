import { redirect } from "next/navigation";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import { FeedbackAssessmentView } from "@/features/peerFeedback/components/FeedbackListView";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const flagMap = await getFeatureFlagMap();
  if (!flagMap["peer_feedback"]) redirect(`/projects/${projectId}`);

  const feedbacks = await getPeerAssessmentsForUser("4", projectId); //hardcoded user id for now
  return (
    <div>
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <div style={{ padding: "30px" }}>
        <h2>Feedbacks</h2>
        <p>Collect and review peer feedback for this project.</p>
        <FeedbackAssessmentView feedbacks={feedbacks} projectId={projectId} />
      </div>
    </div>
  );
}