import Link from "next/link";
import { highlightSearchText } from "@/shared/lib/highlightSearchText";

export type StaffProjectSummary = {
  id: number;
  name: string;
  teamCount: number;
  hasGithubRepo: boolean;
  membersTotal: number;
  membersConnected: number;
};

export type ModuleGroup = {
  moduleId: number;
  moduleName: string;
  projects: StaffProjectSummary[];
};


function GithubHealthPills({
  hasGithubRepo,
  membersTotal,
  membersConnected,
}: {
  hasGithubRepo: boolean;
  membersTotal: number;
  membersConnected: number;
}) {
  const hasMembers = membersTotal > 0;
  const connectionTone = getConnectionTone({
    hasMembers,
    membersTotal,
    membersConnected,
  });

  return (
    <div className="staff-projects__gh-health">
      <span className={`staff-projects__gh-pill ${hasGithubRepo ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"}`}>
        {hasGithubRepo ? "✓ Repo linked" : "⚠ No repo"}
      </span>
      {hasMembers ? (
        <span className={`staff-projects__gh-pill ${connectionTone}`}>
          {membersConnected}/{membersTotal} GitHub
        </span>
      ) : null}
    </div>
  );
}

function getConnectionTone({
  hasMembers,
  membersTotal,
  membersConnected,
}: {
  hasMembers: boolean;
  membersTotal: number;
  membersConnected: number;
}): string {
  if (!hasMembers) return "";
  if (membersConnected === membersTotal) return "staff-projects__gh-pill--ok";
  if (membersConnected > 0) return "staff-projects__gh-pill--partial";
  return "staff-projects__gh-pill--warn";
}

export function ProjectCard({
  project,
  rawQuery,
}: {
  project: StaffProjectSummary;
  rawQuery: string | undefined;
}) {
  return (
    <article className="staff-projects__module-project-card">
      <Link href={`/staff/projects/${project.id}`} className="staff-projects__module-project-link">
        <div className="staff-projects__module-project-head">
          <div className="staff-projects__module-project-copy">
            <h3 className="staff-projects__module-project-title">{highlightSearchText(project.name, rawQuery)}</h3>
            <p className="staff-projects__module-project-sub">
              {project.teamCount} team{project.teamCount === 1 ? "" : "s"} available for staff review.
            </p>
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
