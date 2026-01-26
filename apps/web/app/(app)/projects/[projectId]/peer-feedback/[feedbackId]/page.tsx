import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: Promise<{
    feedbackId: string;
    projectId: string;
  }>;
};

export default async function PeerFeedbackReview({ params }: ProjectPageProps) {
  const { feedbackId, projectId } = await params;
  return (
    <div className="stack">
        <ProjectNav projectId={projectId} />
        <Placeholder
        title="Feedback review"
        path={`/projects/${projectId}/peer-feedback/${feedbackId}/review`}
        description="View and review a peer feedback for this project."
      />
    </div>
  );
}
