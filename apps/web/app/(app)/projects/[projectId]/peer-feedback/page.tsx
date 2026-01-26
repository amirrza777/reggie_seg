import { FeedbackForm } from "@/features/peerFeedback/components/FeedbackForm";
import { QuestionnaireBuilder } from "@/features/peerFeedback/components/QuestionnaireBuilder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
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
