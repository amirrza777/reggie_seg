import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: { assessmentId: string; projectId : string};
};

export default function PeerFeedbackReview({ params }: ProjectPageProps) {
  const { assessmentId, projectId } = params;
  return (
    <div className="stack">
        <ProjectNav projectId={projectId} />
        <Placeholder
        title="Feedback review"
        path={`/projects/${projectId}/peer-feedback/${assessmentId}/review`}
        description="View and review a peer feedback for this project."
      />
    </div>
  );
}
