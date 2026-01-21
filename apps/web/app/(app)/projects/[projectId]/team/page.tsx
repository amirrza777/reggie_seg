type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <section className="placeholder">
      <p className="eyebrow">/projects/{projectId}/team</p>
      <h2>Project team</h2>
      <p className="lede">Manage team members and roles.</p>
    </section>
  );
}
