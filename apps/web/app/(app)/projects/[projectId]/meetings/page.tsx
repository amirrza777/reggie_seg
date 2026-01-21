type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectMeetingsPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <section className="placeholder">
      <p className="eyebrow">/projects/{projectId}/meetings</p>
      <h2>Meetings</h2>
      <p className="lede">Track agendas, attendance, and minutes.</p>
    </section>
  );
}
