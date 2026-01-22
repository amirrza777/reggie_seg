import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/src/features/projects/components/ProjectNav";
import { QuestionnaireBuilder } from "@/src/features/peerFeedback/components/QuestionnaireBuilder";
import { FeedbackForm } from "@/src/features/peerFeedback/components/FeedbackForm";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = params;
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
    </div>
  );
}
