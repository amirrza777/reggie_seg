"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { SkeletonText } from "@/shared/ui/Skeleton";
import type { ArchivableModule, ArchivableProject, ArchivableTeam, ArchiveTab } from "../types";
import { getArchiveModules, getArchiveProjects, getArchiveTeams, archiveItem, unarchiveItem } from "../api/client";

type TableRow = {
  id: number;
  name: string;
  subtitle: string;
  archivedAt: string | null;
};

type ArchiveState = {
  activeTab: ArchiveTab;
  setActiveTab: Dispatch<SetStateAction<ArchiveTab>>;
  modules: ArchivableModule[];
  projects: ArchivableProject[];
  teams: ArchivableTeam[];
  fetching: boolean;
  loading: string | null;
  toggle: (type: ArchiveTab, id: number, isArchived: boolean) => Promise<void>;
};

function useArchiveDataLoad(
  setModules: Dispatch<SetStateAction<ArchivableModule[]>>,
  setProjects: Dispatch<SetStateAction<ArchivableProject[]>>,
  setTeams: Dispatch<SetStateAction<ArchivableTeam[]>>,
  setFetching: Dispatch<SetStateAction<boolean>>
) {
  useEffect(() => {
    Promise.all([getArchiveModules(), getArchiveProjects(), getArchiveTeams()])
      .then(([modules, projects, teams]) => {
        setModules(modules);
        setProjects(projects);
        setTeams(teams);
      })
      .finally(() => setFetching(false));
  }, [setFetching, setModules, setProjects, setTeams]);
}

function useArchiveToggle(params: {
  setLoading: Dispatch<SetStateAction<string | null>>;
  setModules: Dispatch<SetStateAction<ArchivableModule[]>>;
  setProjects: Dispatch<SetStateAction<ArchivableProject[]>>;
  setTeams: Dispatch<SetStateAction<ArchivableTeam[]>>;
}) {
  return async (type: ArchiveTab, id: number, isArchived: boolean) => {
    const key = `${type}-${id}`;
    params.setLoading(key);
    try {
      if (isArchived) {
        await unarchiveItem(type, id);
      } else {
        await archiveItem(type, id);
      }
      const archivedAt = isArchived ? null : new Date().toISOString();
      if (type === "modules") {
        params.setModules((previous) => previous.map((item) => (item.id === id ? { ...item, archivedAt } : item)));
      } else if (type === "projects") {
        params.setProjects((previous) => previous.map((item) => (item.id === id ? { ...item, archivedAt } : item)));
      } else {
        params.setTeams((previous) => previous.map((item) => (item.id === id ? { ...item, archivedAt } : item)));
      }
    } catch {
      // Keep current local state when the toggle request fails.
    } finally {
      params.setLoading(null);
    }
  };
}

function useArchiveManagerState(): ArchiveState {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("modules");
  const [modules, setModules] = useState<ArchivableModule[]>([]);
  const [projects, setProjects] = useState<ArchivableProject[]>([]);
  const [teams, setTeams] = useState<ArchivableTeam[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  useArchiveDataLoad(setModules, setProjects, setTeams, setFetching);
  const toggle = useArchiveToggle({ setLoading, setModules, setProjects, setTeams });
  return { activeTab, setActiveTab, modules, projects, teams, fetching, loading, toggle };
}

function getRowsForTab(activeTab: ArchiveTab, modules: ArchivableModule[], projects: ArchivableProject[], teams: ArchivableTeam[]) {
  if (activeTab === "modules") {
    return modules.map((item) => ({ id: item.id, name: item.name, subtitle: `${item._count.projects} project${item._count.projects !== 1 ? "s" : ""}`, archivedAt: item.archivedAt }));
  }
  if (activeTab === "projects") {
    return projects.map((item) => ({ id: item.id, name: item.name, subtitle: `${item.module.name} · ${item._count.teams} team${item._count.teams !== 1 ? "s" : ""}`, archivedAt: item.archivedAt }));
  }
  return teams.map((item) => ({ id: item.id, name: item.teamName, subtitle: `${item.project.name} · ${item._count.allocations} member${item._count.allocations !== 1 ? "s" : ""}`, archivedAt: item.archivedAt }));
}

function ArchiveTabs({ activeTab, setActiveTab }: { activeTab: ArchiveTab; setActiveTab: Dispatch<SetStateAction<ArchiveTab>> }) {
  const tabs: { key: ArchiveTab; label: string }[] = [{ key: "modules", label: "Modules" }, { key: "projects", label: "Projects" }, { key: "teams", label: "Teams" }];
  return (
    <nav className="pill-nav archive-tabs" role="tablist" aria-label="Archive sections">
      {tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} tabIndex={activeTab === tab.key ? 0 : -1} className={`pill-nav__link${activeTab === tab.key ? " pill-nav__link--active" : ""}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>)}
    </nav>
  );
}

type TableProps = {
  rows: TableRow[];
  type: ArchiveTab;
  loading: string | null;
  onToggle: (type: ArchiveTab, id: number, isArchived: boolean) => void;
};

function ArchiveTableRow({ row, type, loading, onToggle }: { row: TableRow; type: ArchiveTab; loading: string | null; onToggle: (type: ArchiveTab, id: number, isArchived: boolean) => void }) {
  const isArchived = Boolean(row.archivedAt);
  const key = `${type}-${row.id}`;
  return (
    <tr className={isArchived ? "archive-row--archived" : ""}>
      <td className="archive-row__name">{row.name}</td>
      <td className="archive-row__subtitle">{row.subtitle}</td>
      <td><span className={`archive-badge ${isArchived ? "archive-badge--archived" : "archive-badge--active"}`}>{isArchived ? "Archived" : "Active"}</span></td>
      <td><button type="button" className={`archive-btn ${isArchived ? "archive-btn--unarchive" : "archive-btn--archive"}`} disabled={loading === key} onClick={() => onToggle(type, row.id, isArchived)}>{loading === key ? "…" : isArchived ? "Unarchive" : "Archive"}</button></td>
    </tr>
  );
}

function ArchiveTable({ rows, type, loading, onToggle }: TableProps) {
  if (rows.length === 0) {
    return <p className="archive-empty">No {type} found.</p>;
  }
  return (
    <div className="archive-table-wrap">
      <table className="archive-table">
        <thead><tr><th>Name</th><th>Details</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{rows.map((row) => <ArchiveTableRow key={row.id} row={row} type={type} loading={loading} onToggle={onToggle} />)}</tbody>
      </table>
    </div>
  );
}

export function ArchiveManager() {
  const state = useArchiveManagerState();
  if (state.fetching) {
    return <div className="archive-empty" role="status" aria-live="polite"><SkeletonText lines={2} widths={["34%", "74%"]} /><span className="ui-visually-hidden">Loading…</span></div>;
  }
  return (
    <div className="archive-manager">
      <ArchiveTabs activeTab={state.activeTab} setActiveTab={state.setActiveTab} />
      <ArchiveTable rows={getRowsForTab(state.activeTab, state.modules, state.projects, state.teams)} type={state.activeTab} loading={state.loading} onToggle={state.toggle} />
    </div>
  );
}
