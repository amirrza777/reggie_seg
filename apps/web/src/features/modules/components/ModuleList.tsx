"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Module } from "../types";
import "@/features/modules/styles/module-list.css";

type ModuleListProps = {
  modules?: Module[];
  emptyMessage?: string;
  sortBy?: ModuleSortKey;
  onSortByChange?: (sortBy: ModuleSortKey) => void;
  showSortControl?: boolean;
};

export type ModuleSortKey = "alphabetical" | "teamCount" | "projectCount" | "accessLevel";

export const MODULE_SORT_OPTIONS: Array<{ value: ModuleSortKey; label: string }> = [
  { value: "alphabetical", label: "Alphabetical (A-Z)" },
  { value: "teamCount", label: "Team count (high to low)" },
  { value: "projectCount", label: "Project count (high to low)" },
  { value: "accessLevel", label: "Access level" },
];

const titleCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function getRolePresentation(role?: Module["accountRole"]) {
  if (role === "OWNER") return { label: "Owner", tone: "owner" };
  if (role === "TEACHING_ASSISTANT") return { label: "Teaching assistant", tone: "assistant" };
  if (role === "ADMIN_ACCESS") return { label: "Admin access", tone: "admin" };
  return { label: "Enrolled", tone: "enrolled" };
}

function getAccessLevelRank(role?: Module["accountRole"]) {
  if (role === "OWNER") return 0;
  if (role === "ADMIN_ACCESS") return 1;
  if (role === "TEACHING_ASSISTANT") return 2;
  return 3;
}

function compareByTitle(a: Module, b: Module) {
  return titleCollator.compare(a.title, b.title);
}

function sortModules(modules: Module[], sortBy: ModuleSortKey) {
  const sorted = [...modules];

  sorted.sort((a, b) => {
    if (sortBy === "teamCount") {
      const byTeams = (b.teamCount ?? 0) - (a.teamCount ?? 0);
      return byTeams || compareByTitle(a, b);
    }

    if (sortBy === "projectCount") {
      const byProjects = (b.projectCount ?? 0) - (a.projectCount ?? 0);
      return byProjects || compareByTitle(a, b);
    }

    if (sortBy === "accessLevel") {
      const byAccess = getAccessLevelRank(a.accountRole) - getAccessLevelRank(b.accountRole);
      return byAccess || compareByTitle(a, b);
    }

    return compareByTitle(a, b);
  });

  return sorted;
}

export function ModuleList({
  modules = [],
  emptyMessage = "No modules assigned yet.",
  sortBy,
  onSortByChange,
  showSortControl = true,
}: ModuleListProps) {
  const [internalSortBy, setInternalSortBy] = useState<ModuleSortKey>("alphabetical");
  const activeSortBy = sortBy ?? internalSortBy;
  const sortedModules = useMemo(() => sortModules(modules, activeSortBy), [modules, activeSortBy]);

  const handleSortChange = (nextSortBy: ModuleSortKey) => {
    if (sortBy === undefined) {
      setInternalSortBy(nextSortBy);
    }
    onSortByChange?.(nextSortBy);
  };

  if (modules.length === 0) {
    return (
      <div className="module-list-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="module-list">
      {showSortControl ? (
        <div className="module-list__toolbar">
          <label htmlFor="module-list-sort" className="module-list__sort-label">
            Sort by
          </label>
          <select
            id="module-list-sort"
            className="module-list__sort-select"
            value={activeSortBy}
            onChange={(event) => handleSortChange(event.target.value as ModuleSortKey)}
          >
            {MODULE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="module-list__grid">
        {sortedModules.map((module) => {
          const numericId = Number(module.id);
          const moduleCode = Number.isFinite(numericId) ? `MOD-${numericId}` : module.id;
          const teams = module.teamCount ?? 0;
          const projects = module.projectCount ?? 0;
          const role = getRolePresentation(module.accountRole);
          const canManageModule = module.accountRole === "OWNER";
          const canCreateProject = module.accountRole === "OWNER" || module.accountRole === "ADMIN_ACCESS";

          return (
            <article key={module.id} className="module-card card">
              <div className="module-card__header">
                <div className="module-card__header-top">
                  <h2 className="module-card__title">{module.title}</h2>
                  <span className={`module-card__role module-card__role--${role.tone}`}>
                    {role.label}
                  </span>
                </div>
                <p className="module-card__meta">Code: {moduleCode}</p>
              </div>
              {module.description ? (
                <p className="module-card__summary">{module.description}</p>
              ) : null}
              <div className="module-card__footer">
                <span className="module-card__counts">
                  {teams} team{teams === 1 ? "" : "s"} · {projects} project{projects === 1 ? "" : "s"}
                </span>
                <div className="module-card__actions">
                  {canManageModule ? (
                    <Link href={`/staff/modules/${encodeURIComponent(module.id)}/manage`} className="module-card__manage">
                      Manage module
                    </Link>
                  ) : null}
                  {canCreateProject ? (
                    <Link href={`/staff/projects/create?moduleId=${encodeURIComponent(module.id)}`} className="module-card__manage">
                      Create project
                    </Link>
                  ) : null}
                  <Link href={`/modules/${encodeURIComponent(module.id)}`} className="module-card__cta">
                    View Module
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
