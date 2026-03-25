import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type StaffModuleProjectCardTeam = {
  id: number;
  teamName: string;
  memberCount: number;
  hasRepo: boolean;
  trelloBoardId: string | null;
};

export type StaffModuleProjectCardProject = {
  id: number;
  name: string;
  teamCount: number;
  hasGithubRepo: boolean;
  membersTotal: number;
  membersConnected: number;
  visibleTeams: StaffModuleProjectCardTeam[];
  teamFetchFailed: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearchText(text: string, query?: string): ReactNode {
  const terms = String(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(pattern);
  if (parts.length <= 1) return text;

  const lowerTerms = new Set(terms.map((term) => term.toLowerCase()));
  return parts.map((part, index) =>
    lowerTerms.has(part.toLowerCase()) ? (
      <mark key={`hit-${index}`} className="staff-projects__search-hit">
        {part}
      </mark>
    ) : (
      <Fragment key={`txt-${index}`}>{part}</Fragment>
    ),
  );
}

function ProjectTeams({
  projectId,
  teams,
  teamFetchFailed,
  rawQuery,
}: {
  projectId: number;
  teams: StaffModuleProjectCardTeam[];
  teamFetchFailed: boolean;
  rawQuery: string | undefined;
}) {
  if (teams.length === 0) {
    return <p className="muted">{teamFetchFailed ? "Could not load teams right now." : "No teams in this project yet."}</p>;
  }

  return (
    <>
      {teams.map((team) => {
        const hasBoard = Boolean(team.trelloBoardId && String(team.trelloBoardId).trim().length > 0);
        return (
          <Link key={team.id} href={`/staff/projects/${projectId}/teams/${team.id}`} className="staff-projects__module-team-link">
            <div className="staff-projects__module-team-main">
              <span className="staff-projects__module-team-name">{highlightSearchText(team.teamName, rawQuery)}</span>
              <span className="staff-projects__module-team-meta">
                {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="staff-projects__module-team-right">
              <div className="staff-projects__gh-health staff-projects__module-team-integrations" aria-label="GitHub and Trello status">
                <span
                  className={`staff-projects__gh-pill ${team.hasRepo ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"}`}
                >
                  {team.hasRepo ? "✓ GitHub connected" : "⚠ No GitHub repo"}
                </span>
                <span
                  className={`staff-projects__gh-pill ${hasBoard ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"}`}
                >
                  {hasBoard ? "✓ Trello board linked" : "⚠ No Trello board"}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}

export type StaffModuleProjectCardProps = {
  project: StaffModuleProjectCardProject;
  hasQuery: boolean;
  rawQuery: string | undefined;
};

/**
 * Expandable project row (teams, staff hub links, GitHub health) — shared by the all-modules list and single-module views.
 */
export function StaffModuleProjectCard({ project, hasQuery, rawQuery }: StaffModuleProjectCardProps) {
  return (
    <details className="staff-projects__module-project-card" open={hasQuery}>
      <summary className="staff-projects__module-project-summary">
        <div className="staff-projects__module-project-head">
          <div className="staff-projects__module-project-copy">
            <h3 className="staff-projects__module-project-title">{highlightSearchText(project.name, rawQuery)}</h3>
            <p className="staff-projects__module-project-sub">
              {project.teamCount} team{project.teamCount === 1 ? "" : "s"} available for staff review.
            </p>
          </div>
          <div className="staff-projects__module-project-actions">
          <Link href={`/staff/projects/${project.id}`} className="staff-projects__badge">
            Open project
          </Link>
          <Link href={`/staff/projects/${project.id}/team-allocation`} className="staff-projects__badge">
            Team allocation
          </Link>
        </div>
        </div>
        <span className="staff-projects__project-toggle" aria-hidden="true" />
      </summary>

      <div className="staff-projects__module-project-content">

        <div className="staff-projects__module-team-list" aria-label={`Teams in ${project.name}`}>
          <ProjectTeams
            projectId={project.id}
            teams={project.visibleTeams}
            teamFetchFailed={project.teamFetchFailed}
            rawQuery={rawQuery}
          />
        </div>
      </div>
    </details>
  );
}

export type StaffModuleProjectCardListProps = {
  projects: StaffModuleProjectCardProject[];
  hasQuery: boolean;
  rawQuery: string | undefined;
  /** e.g. "Projects in this module" vs grouped all-modules view */
  "aria-label"?: string;
};


export function StaffModuleProjectCardList({
  projects,
  hasQuery,
  rawQuery,
  "aria-label": ariaLabel = "Projects in this module",
}: StaffModuleProjectCardListProps) {
  return (
    <section className="staff-projects__module-list staff-projects__module-list--flat" aria-label={ariaLabel}>
      <div className="staff-projects__module-projects">
        {projects.map((project) => (
          <StaffModuleProjectCard key={project.id} project={project} hasQuery={hasQuery} rawQuery={rawQuery} />
        ))}
      </div>
    </section>
  );
}
