type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectPeerFeedbackPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <section className="placeholder">
      <p className="eyebrow">/projects/{projectId}/peer-feedback</p>
      <h2>Peer feedback</h2>
      <p className="lede">Collect and review peer feedback for this project.</p>
    </section>
  );
}
