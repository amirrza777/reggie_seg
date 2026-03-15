import "@/features/staff/projects/styles/staff-projects.css";

type StaffTeamSectionPlaceholderProps = {
  title: string;
  description: string;
};

export function StaffTeamSectionPlaceholder({ title, description }: StaffTeamSectionPlaceholderProps) {
  return (
    <section className="staff-projects__team-card">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <p className="muted">
        This section is intentionally scaffolded so feature work can be added incrementally.
      </p>
    </section>
  );
}
