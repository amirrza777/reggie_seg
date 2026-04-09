import Link from "next/link";
import { ProgressPie } from "@/shared/ui/ProgressPie";
import type { StaffProject } from "@/features/projects/types";
import { formatDate } from "@/shared/lib/formatDate";
import { highlightSearchText } from "@/shared/lib/highlightSearchText";

export type { StaffProject };

export type ModuleGroup = {
  moduleId: number;
  moduleName: string;
  projects: StaffProject[];
};

function githubPieTooltip(project: StaffProject): string {
  const base =
    "Share of students on active teams who have linked their GitHub account.";
  if (project.membersTotal === 0) {return `${base} No students on active teams yet.`;}
  return `${base} ${project.membersConnected}/${project.membersTotal} students linked.`;
}

function trelloPieTooltip(project: StaffProject): string {
  const base =
    "Share of active teams that have a Trello board linked.";
  if (project.teamCount === 0) {return `${base} No active teams yet.`;}
  return `${base} ${project.trelloBoardsLinkedCount}/${project.teamCount} teams with a board linked.`;
}

function peerPieTooltip(project: StaffProject): string {
  const base =
    "Share of expected peer assessments submitted.";
  if (project.peerAssessmentsExpectedCount === 0) {
    return `${base} No assessments expected yet (teams need at least two members).`;
  }
  return `${base} ${project.peerAssessmentsSubmittedCount}/${project.peerAssessmentsExpectedCount} submitted.`;
}

function formatProjectDeadlineRange(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) {return "No deadlines scheduled";}
  const startLabel = formatDate(startIso);
  const endLabel = formatDate(endIso);
  if (!startLabel || !endLabel) {return "No deadlines scheduled";}
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.toDateString() === end.toDateString()) {return startLabel;}
  return `${startLabel} – ${endLabel}`;
}

export function ProjectCard({
  project,
  rawQuery,
}: {
  project: StaffProject;
  rawQuery: string | undefined;
}) {
  const isArchived = project.archivedAt != null;
  const archivedDateLabel = project.archivedAt ? formatDate(project.archivedAt) : "";
  const archivedTooltip = archivedDateLabel ? `Archived on ${archivedDateLabel}` : "Archived";
  return (
    <article
      className={`staff-projects__module-project-card${isArchived ? " staff-projects__module-project-card--archived" : ""}`}
    >
      <Link
        href={`/staff/projects/${project.id}`}
        className="staff-projects__module-project-link"
        aria-label={isArchived ? `${project.name} (archived project)` : undefined}
      >
        <div className="staff-projects__module-project-head staff-projects__module-project-head--rich">
          <div className="staff-projects__module-project-copy">
            <div className="staff-projects__module-project-title-row">
              <h3 className="staff-projects__module-project-title">{highlightSearchText(project.name, rawQuery)}</h3>
              {isArchived ? (
                <span
                  className="staff-projects__project-archived-pill"
                  title={archivedTooltip}
                  aria-label={archivedTooltip}
                >
                  Archived
                </span>
              ) : null}
            </div>
            <p className="staff-projects__module-project-sub">
              {formatProjectDeadlineRange(project.dateRangeStart, project.dateRangeEnd)}
            </p>
          </div>
          <div className="staff-projects__module-project-metrics">
            <div className="staff-projects__integration-pies">
              <ProgressPie
                value={project.githubIntegrationPercent}
                title="GitHub"
                tooltip={githubPieTooltip(project)}
              />
              <ProgressPie
                value={project.trelloBoardsLinkedPercent}
                title="Trello"
                tooltip={trelloPieTooltip(project)}
              />
              <ProgressPie
                value={project.peerAssessmentsSubmittedPercent}
                title="Assessments"
                tooltip={peerPieTooltip(project)}
              />
            </div>
            <div className="staff-projects__project-stat-pills">
              <span className="staff-projects__stat-pill">
                {project.teamCount} team{project.teamCount === 1 ? "" : "s"}
              </span>
              <span className="staff-projects__stat-pill">
                {project.membersTotal} student{project.membersTotal === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
        <span className="staff-projects__project-toggle" aria-hidden="true">
          →
        </span>
      </Link>
    </article>
  );
}

function ModuleGroupCard({ module, hasQuery, rawQuery }: { module: ModuleGroup; hasQuery: boolean; rawQuery: string | undefined }) {
  const teamTotal = module.projects.reduce((sum, project) => sum + project.teamCount, 0);

  return (
    <details className="staff-projects__module-group" open={hasQuery}>
      <summary className="staff-projects__module-summary">
        <div className="staff-projects__module-heading">
          <h2 className="staff-projects__module-title">{highlightSearchText(module.moduleName, rawQuery)}</h2>
          <p className="staff-projects__module-subtitle">
            {module.projects.length} project{module.projects.length === 1 ? "" : "s"} · {teamTotal} team{teamTotal === 1 ? "" : "s"}
          </p>
        </div>
        <span className="staff-projects__module-toggle" aria-hidden="true" />
      </summary>

      <div className="staff-projects__module-projects">
        {module.projects.map((project) => (
          <ProjectCard key={project.id} project={project} rawQuery={rawQuery} />
        ))}
      </div>
    </details>
  );
}

export function StaffProjectsModuleList({
  modules,
  hasQuery,
  rawQuery,
}: {
  modules: ModuleGroup[];
  hasQuery: boolean;
  rawQuery: string | undefined;
}) {
  return (
    <section className="staff-projects__module-list" aria-label="Staff projects grouped by module">
      {modules.map((module) => (
        <ModuleGroupCard key={module.moduleId} module={module} hasQuery={hasQuery} rawQuery={rawQuery} />
      ))}
    </section>
  );
}
