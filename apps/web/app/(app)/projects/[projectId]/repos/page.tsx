type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectReposPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <section className="placeholder">
      <p className="eyebrow">/projects/{projectId}/repos</p>
      <h2>Repos</h2>
      <p className="lede">Link repositories for this project.</p>
    </section>
  );
}
