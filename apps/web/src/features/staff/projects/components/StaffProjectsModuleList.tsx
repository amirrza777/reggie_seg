import { Fragment, type ReactNode } from "react";
import type { ModuleGroup } from "@/features/staff/projects/lib/staffModuleProjectsPageData";
import { StaffModuleProjectCard } from "./StaffModuleProjectCard";
import React from "react";

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

function ModuleGroupCard({ module, hasQuery, rawQuery }: { module: ModuleGroup; hasQuery: boolean; rawQuery: string | undefined }) {
  const teamTotal = module.projects.reduce((sum, project) => sum + project.visibleTeams.length, 0);

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
          <StaffModuleProjectCard key={project.id} project={project} hasQuery={hasQuery} rawQuery={rawQuery} />
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
