import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <Placeholder
      title="Peer feedback"
      path={`/projects/${projectId}/peer-feedback`}
      description="Collect and review peer feedback for this project."
    />
  );
}
