import { FeedbackForm } from "@/features/peerFeedback/components/FeedbackForm";
import { QuestionnaireBuilder } from "@/features/peerFeedback/components/QuestionnaireBuilder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";
import { getPeerFeedbacksForUser } from "@/features/peerFeedback/api/client";
import { FeedbackListView } from "@/features/peerFeedback/components/FeedbackListView";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

const temporaryUserId = "1";

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const feedbacks = await getPeerFeedbacksForUser("3");
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <Placeholder
        title="Peer feedback"
        path={`/projects/${projectId}/peer-feedback`}
        description="Collect and review peer feedback for this project."
      />
      <QuestionnaireBuilder />
      <FeedbackForm projectId={projectId} />
      <h2> Feedbacks </h2>
      <FeedbackListView feedbacks={feedbacks} projectId={projectId} />

    </div>
  );
}
