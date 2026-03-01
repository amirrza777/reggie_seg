import type { Team } from "../types";
import "@/features/projects/styles/project-team-list.css";

type ProjectTeamListProps = {
  team: Team;
};

function sortTeammates(team: Team) {
  return [...(team.allocations || [])].sort((a, b) => {
    const aName = `${a.user.firstName} ${a.user.lastName}`.trim().toLowerCase();
    const bName = `${b.user.firstName} ${b.user.lastName}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });
}

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] || "";
  const last = lastName?.trim()?.[0] || "";
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : "?";
}

export function ProjectTeamList({ team }: ProjectTeamListProps) {
  const teammates = sortTeammates(team);

  if (teammates.length === 0) {
    return (
      <div className="project-team-list-empty">
        <p>No teammates found for this project team.</p>
      </div>
    );
  }

  return (
    <ul className="project-team-list">
      {teammates.map((allocation) => {
        const fullName =
          `${allocation.user.firstName} ${allocation.user.lastName}`.trim() ||
          allocation.user.email;

        return (
          <li key={allocation.userId} className="project-team-list__item">
            <div className="project-team-list__avatar" aria-hidden="true">
              {getInitials(allocation.user.firstName, allocation.user.lastName)}
            </div>
            <div className="project-team-list__meta">
              <p className="project-team-list__name">{fullName}</p>
              <p className="project-team-list__email">{allocation.user.email}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
