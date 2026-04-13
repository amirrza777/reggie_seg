"use client";

import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";
import { useArchiveManager } from "../hooks/useArchiveManager";
import { filterModulesByScope, filterProjectsByScope } from "../lib/archiveScopes";
import { archiveTableEmptyMessage } from "../lib/archiveEmptyMessages";
import { getArchiveTableRows } from "../lib/archiveTableRows";
import { ArchiveListScopeToolbar, ArchiveTabs } from "./ArchiveNavigation";
import { ArchiveTable } from "./ArchiveTable";

export function ArchiveManager() {
  const state = useArchiveManager();
  if (state.fetching) {
    return (
      <div className="archive-empty" role="status" aria-live="polite">
        <SkeletonText lines={2} widths={["34%", "74%"]} />
        <span className="ui-visually-hidden">Loading…</span>
      </div>
    );
  }

  const modulesForTable =
    state.activeTab === "modules" ? filterModulesByScope(state.modules, state.moduleListScope) : state.modules;

  const projectsForTable =
    state.activeTab === "projects" ? filterProjectsByScope(state.projects, state.projectListScope) : state.projects;

  const listScopeToolbar =
    state.activeTab === "modules"
      ? {
          scope: state.moduleListScope,
          onScopeChange: state.setModuleListScope,
          ariaLabel: "Module list filter" as const,
        }
      : {
          scope: state.projectListScope,
          onScopeChange: state.setProjectListScope,
          ariaLabel: "Project list filter" as const,
        };

  return (
    <div className="archive-manager">
      <ArchiveTabs activeTab={state.activeTab} setActiveTab={state.setActiveTab} />
      <ArchiveListScopeToolbar {...listScopeToolbar} />
      <ArchiveTable
        rows={getArchiveTableRows(state.activeTab, modulesForTable, projectsForTable)}
        type={state.activeTab}
        loading={state.loading}
        onToggle={state.toggle}
        emptyMessage={archiveTableEmptyMessage(
          state.activeTab,
          state.moduleListScope,
          state.projectListScope,
        )}
      />
    </div>
  );
}
