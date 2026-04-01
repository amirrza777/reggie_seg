"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Module } from "../types";
import { formatDate } from "@/shared/lib/formatDate";
import { MODULE_SORT_OPTIONS, type ModuleSortKey } from "./moduleSortOptions";
import "@/features/modules/styles/module-list.css";

type ModuleListProps = {
  modules?: Module[];
  emptyMessage?: string;
  sortBy?: ModuleSortKey;
  onSortByChange?: (sortBy: ModuleSortKey) => void;
  showSortControl?: boolean;
  toolbarAction?: ReactNode;
  moduleHrefBasePath?: string;
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
    if (sortBy === "leaderCount") return compareWithFallback((b.leaderCount ?? 0) - (a.leaderCount ?? 0), a, b);
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
  moduleHrefBasePath = "/modules",
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
            <ModuleCard key={module.id} module={module} moduleHrefBasePath={moduleHrefBasePath} />
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

function formatModuleDateRange(module: Module): string | null {
  const startLabel = formatDate(module.projectWindowStart);
  if (!startLabel) return null;
  const endLabel = formatDate(module.projectWindowEnd);
  return endLabel ? `${startLabel} – ${endLabel}` : `${startLabel} – ongoing`;
}

function ModuleCard({
  module,
  moduleHrefBasePath,
}: {
  module: Module;
  moduleHrefBasePath: string;
}) {
  const router = useRouter();
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const role = getRolePresentation(module.accountRole);
  const leads = module.leaderCount ?? 0;
  const tas = module.teachingAssistantCount ?? 0;
  const projects = module.projectCount ?? 0;
  const dateRange = formatModuleDateRange(module);
  const moduleId = encodeURIComponent(module.id);
  const basePath = moduleHrefBasePath.replace(/\/$/, "");
  const viewModuleHref = `${basePath}/${moduleId}`;
  const canManageModule = module.accountRole === "OWNER";
  const canCreateNewProject = canCreateProject(module.accountRole);
  const shouldShowActionMenu = canManageModule || canCreateNewProject;

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isActionMenuOpen]);

  const openModule = () => {
    router.push(viewModuleHref);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openModule();
  };

  return (
    <article
      className={`module-card card${isActionMenuOpen ? " module-card--menu-open" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={`View module ${module.title}`}
      onClick={openModule}
      onKeyDown={handleCardKeyDown}
    >
      <div className="module-card__header">
        <div className="module-card__header-top">
          <h2 className="module-card__title">{module.title}</h2>
          <span className={`module-card__role module-card__role--${role.tone}`}>{role.label}</span>
        </div>
        <p className="module-card__meta">Code: {formatModuleCode(module.id, module.code)}</p>
        {dateRange ? <p className="module-card__dates muted">{dateRange}</p> : null}
      </div>
      {module.description ? <p className="module-card__summary">{module.description}</p> : null}
      <div className="module-card__footer">
        <span className="module-card__counts">
          <Link
            href={`${viewModuleHref}/projects`}
            className="module-card__counts-link"
            onClick={(e) => e.stopPropagation()}
          >
            {projects} {pluralize("project", projects)}
          </Link>
          {` • ${leads} module ${pluralize("lead", leads)} • ${tas} ${pluralize("teaching assistant", tas)}`}
        </span>
        {shouldShowActionMenu ? (
          <div
            className="module-card__actions"
            ref={actionMenuRef}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="module-card__menu-trigger"
              aria-label={`Module actions for ${module.title}`}
              aria-expanded={isActionMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsActionMenuOpen((open) => !open)}
            >
              •••
            </button>
            {isActionMenuOpen ? (
              <div className="module-card__menu-panel" role="menu">
                <Link
                  href={`/staff/modules/${moduleId}/projects`}
                  role="menuitem"
                  className="module-card__menu-item"
                  onClick={() => setIsActionMenuOpen(false)}
                >
                  View projects
                </Link>
                {canCreateNewProject ? (
                  <Link
                    href={`/staff/projects/create?moduleId=${moduleId}`}
                    role="menuitem"
                    className="module-card__menu-item"
                    onClick={() => setIsActionMenuOpen(false)}
                  >
                    Create project
                  </Link>
                ) : null}
                {canManageModule ? (
                  <Link
                    href={`/staff/modules/${moduleId}/settings`}
                    role="menuitem"
                    className="module-card__menu-item"
                    onClick={() => setIsActionMenuOpen(false)}
                  >
                    Manage module
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function canCreateProject(role?: Module["accountRole"]): boolean {
  return role === "OWNER" || role === "ADMIN_ACCESS";
}

function formatModuleCode(moduleId: string, moduleCode?: string): string {
  if (moduleCode?.trim()) return moduleCode.trim();
  const numericId = Number(moduleId);
  return Number.isFinite(numericId) ? `MOD-${numericId}` : moduleId;
}

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}
