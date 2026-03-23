"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Module } from "../types";
import { MODULE_SORT_OPTIONS, type ModuleSortKey } from "./moduleSortOptions";
import "@/features/modules/styles/module-list.css";

type ModuleListProps = {
  modules?: Module[];
  emptyMessage?: string;
  sortBy?: ModuleSortKey;
  onSortByChange?: (sortBy: ModuleSortKey) => void;
  showSortControl?: boolean;
  toolbarAction?: ReactNode;
};

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
  return [...modules].sort((a, b) => {
    if (sortBy === "teamCount") return compareWithFallback((b.teamCount ?? 0) - (a.teamCount ?? 0), a, b);
    if (sortBy === "projectCount") return compareWithFallback((b.projectCount ?? 0) - (a.projectCount ?? 0), a, b);
    if (sortBy === "accessLevel") return compareWithFallback(getAccessLevelRank(a.accountRole) - getAccessLevelRank(b.accountRole), a, b);
    return compareByTitle(a, b);
  });
}

function compareWithFallback(primary: number, a: Module, b: Module) {
  return primary || compareByTitle(a, b);
}

export function ModuleList({
  modules = [],
  emptyMessage = "No modules assigned yet.",
  sortBy,
  onSortByChange,
  showSortControl = true,
  toolbarAction,
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

  return (
    <div className="module-list">
      {showSortControl || toolbarAction ? (
        <div className={`module-list__toolbar${toolbarAction ? "" : " module-list__toolbar--sort-only"}`}>
          {toolbarAction ? <div className="module-list__toolbar-action">{toolbarAction}</div> : null}
          {showSortControl ? <ModuleSortControl activeSortBy={activeSortBy} onSortChange={handleSortChange} /> : null}
        </div>
      ) : null}
      {modules.length === 0 ? (
        <div className="module-list-empty">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="module-list__grid">
          {sortedModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleSortControl({
  activeSortBy,
  onSortChange,
}: {
  activeSortBy: ModuleSortKey;
  onSortChange: (sortBy: ModuleSortKey) => void;
}) {
  return (
    <div className="module-list__sort-group">
      <label htmlFor="module-list-sort" className="module-list__sort-label">
        Sort by
      </label>
      <select
        id="module-list-sort"
        className="module-list__sort-select"
        value={activeSortBy}
        onChange={(event) => onSortChange(event.target.value as ModuleSortKey)}
      >
        {MODULE_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const role = getRolePresentation(module.accountRole);
  const teams = module.teamCount ?? 0;
  const projects = module.projectCount ?? 0;
  const moduleId = encodeURIComponent(module.id);

  return (
    <article className="module-card card">
      <div className="module-card__header">
        <div className="module-card__header-top">
          <h2 className="module-card__title">{module.title}</h2>
          <span className={`module-card__role module-card__role--${role.tone}`}>{role.label}</span>
        </div>
        <p className="module-card__meta">Code: {formatModuleCode(module)}</p>
      </div>
      {module.description ? <p className="module-card__summary">{module.description}</p> : null}
      <div className="module-card__footer">
        <span className="module-card__counts">
          {teams} {pluralize("team", teams)} · {projects} {pluralize("project", projects)}
        </span>
        <div className="module-card__actions">
          {module.accountRole === "OWNER" ? <Link href={`/staff/modules/${moduleId}/manage`} className="module-card__manage">Manage module</Link> : null}
          {canCreateProject(module.accountRole) ? <Link href={`/staff/projects/create?moduleId=${moduleId}`} className="module-card__manage">Create project</Link> : null}
          <Link href={`/modules/${moduleId}`} className="module-card__cta">View Module</Link>
        </div>
      </div>
    </article>
  );
}

function canCreateProject(role?: Module["accountRole"]): boolean {
  return role === "OWNER" || role === "ADMIN_ACCESS";
}

function formatModuleCode(module: Module): string {
  if (module.code?.trim()) return module.code.trim();
  const numericId = Number(module.id);
  return Number.isFinite(numericId) ? `MOD-${numericId}` : module.id;
}

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}
