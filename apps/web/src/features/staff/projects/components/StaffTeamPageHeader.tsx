import type { ReactNode } from "react";
import "@/features/staff/projects/styles/staff-projects.css";

export type StaffTeamPageHeaderTeam = {
  id: number;
  teamName: string;
  allocations: Array<unknown>;
};

type StaffTeamPageHeaderProps = {
  team: StaffTeamPageHeaderTeam;
  subtitle?: ReactNode;
};

export function StaffTeamPageHeader({ team, subtitle }: StaffTeamPageHeaderProps) {
  const memberCount = team.allocations.length;

  return (
    <section className="staff-projects__hero">
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
