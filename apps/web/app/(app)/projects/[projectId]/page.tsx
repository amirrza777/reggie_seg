type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectOverviewPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <section className="placeholder">
      <p className="eyebrow">/projects/{projectId}</p>
      <h2>Project overview</h2>
      <p className="lede">Landing view for project {projectId}.</p>
    </section>
  );
}
