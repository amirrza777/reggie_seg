import Link from "next/link";
import type { ReactNode } from "react";
import "@/features/staff/projects/styles/staff-projects.css";

export type StaffTeamPageHeaderProject = {
  id: number;
  name: string;
  moduleId?: number;
  moduleName?: string;
};

export type StaffTeamPageHeaderTeam = {
  id: number;
  teamName: string;
  allocations: Array<unknown>;
};

type StaffTeamPageHeaderProps = {
  project: StaffTeamPageHeaderProject;
  team: StaffTeamPageHeaderTeam;
  subtitle?: ReactNode;
};

export function StaffTeamPageHeader({ project, team, subtitle }: StaffTeamPageHeaderProps) {
  const memberCount = team.allocations.length;

  return (
    <section className="staff-projects__hero">
      <nav className="pill-nav" aria-label="Location">
        {project.moduleName && project.moduleId != null ? (
          <>
            <Link href={`/staff/modules/${project.moduleId}`} className="muted">
              {project.moduleName}
            </Link>
            <span className="muted" aria-hidden>/</span>
          </>
        ) : project.moduleName ? (
          <>
            <Link href="/staff/modules" className="muted">
              {project.moduleName}
            </Link>
            <span className="muted" aria-hidden>/</span>
          </>
        ) : null}
        <Link href={`/staff/projects/${project.id}`} className="muted">
          {project.name}
        </Link>
        <span className="muted" aria-hidden>/</span>
        <Link href={`/staff/projects/${project.id}/teams/${team.id}`} className="muted">
          {team.teamName}
        </Link>
      </nav>
      <h1 className="staff-projects__title">{team.teamName}</h1>
      <div className="staff-projects__meta">
        {subtitle ? <p className="staff-projects__desc">{subtitle}</p> : null}
      </div>
      <span className="staff-projects__badge">
          {memberCount} member{memberCount === 1 ? "" : "s"}
        </span>
    </section>
  );
}
