import Link from "next/link";
import "@/features/staff/projects/styles/staff-projects.css";
import { StaffTeamSectionNav } from "./StaffTeamSectionNav";

type StaffTeamSectionPlaceholderProps = {
  projectId: string;
  teamId: string;
  title: string;
  description: string;
};

export function StaffTeamSectionPlaceholder({
  projectId,
  teamId,
  title,
  description,
}: StaffTeamSectionPlaceholderProps) {
  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Staff Team View</p>
        <h1 className="staff-projects__title">{title}</h1>
        <p className="staff-projects__desc">{description}</p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectId}</span>
          <span className="staff-projects__badge">Team {teamId}</span>
          <Link href={`/staff/projects/${projectId}/teams/${teamId}`} className="staff-projects__badge">
            Back to overview
          </Link>
        </div>
      </section>
      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />
      <section className="staff-projects__team-card">
        <h3 style={{ margin: 0 }}>Placeholder</h3>
        <p className="muted" style={{ margin: 0 }}>
          This section is intentionally scaffolded so feature work can be added incrementally.
        </p>
      </section>
    </div>
  );
}
