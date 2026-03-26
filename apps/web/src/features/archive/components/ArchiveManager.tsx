"use client";

import { useState, useEffect } from "react";
import { SkeletonText } from "@/shared/ui/Skeleton";
import type { ArchivableModule, ArchivableProject, ArchivableTeam, ArchiveTab } from "../types";
import { getArchiveModules, getArchiveProjects, getArchiveTeams, archiveItem, unarchiveItem } from "../api/client";

export function ArchiveManager() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("modules");
  const [modules, setModules] = useState<ArchivableModule[]>([]);
  const [projects, setProjects] = useState<ArchivableProject[]>([]);
  const [teams, setTeams] = useState<ArchivableTeam[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getArchiveModules(), getArchiveProjects(), getArchiveTeams()])
      .then(([m, p, t]) => {
        setModules(m);
        setProjects(p);
        setTeams(t);
      })
      .finally(() => setFetching(false));
  }, []);

  async function toggle(type: ArchiveTab, id: number, isArchived: boolean) {
    const key = `${type}-${id}`;
    setLoading(key);
    try {
      if (isArchived) {
        await unarchiveItem(type, id);
      } else {
        await archiveItem(type, id);
      }
      const now = new Date().toISOString();
      if (type === "modules") {
        setModules((prev) => prev.map((m) => (m.id === id ? { ...m, archivedAt: isArchived ? null : now } : m)));
      } else if (type === "projects") {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archivedAt: isArchived ? null : now } : p)));
      } else {
        setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: isArchived ? null : now } : t)));
      }
    } catch {
      // Keep current local state when the toggle request fails.
    } finally {
      setLoading(null);
    }
  }

  const tabs: { key: ArchiveTab; label: string }[] = [
    { key: "modules", label: "Modules" },
    { key: "projects", label: "Projects" },
    { key: "teams", label: "Teams" },
  ];

  if (fetching) {
    return (
      <div className="archive-empty" role="status" aria-live="polite">
        <SkeletonText lines={2} widths={["34%", "74%"]} />
        <span className="ui-visually-hidden">Loading…</span>
      </div>
    );
  }

  return (
    <div className="archive-manager">
      <div className="archive-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`archive-tab${activeTab === tab.key ? " archive-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "modules" && (
        <ArchiveTable
          rows={modules.map((m) => ({
            id: m.id,
            name: m.name,
            subtitle: `${m._count.projects} project${m._count.projects !== 1 ? "s" : ""}`,
            archivedAt: m.archivedAt,
          }))}
          type="modules"
          loading={loading}
          onToggle={toggle}
        />
      )}

      {activeTab === "projects" && (
        <ArchiveTable
          rows={projects.map((p) => ({
            id: p.id,
            name: p.name,
            subtitle: `${p.module.name} · ${p._count.teams} team${p._count.teams !== 1 ? "s" : ""}`,
            archivedAt: p.archivedAt,
          }))}
          type="projects"
          loading={loading}
          onToggle={toggle}
        />
      )}

      {activeTab === "teams" && (
        <ArchiveTable
          rows={teams.map((t) => ({
            id: t.id,
            name: t.teamName,
            subtitle: `${t.project.name} · ${t._count.allocations} member${t._count.allocations !== 1 ? "s" : ""}`,
            archivedAt: t.archivedAt,
          }))}
          type="teams"
          loading={loading}
          onToggle={toggle}
        />
      )}
    </div>
  );
}

type TableRow = {
  id: number;
  name: string;
  subtitle: string;
  archivedAt: string | null;
};

type TableProps = {
  rows: TableRow[];
  type: ArchiveTab;
  loading: string | null;
  onToggle: (type: ArchiveTab, id: number, isArchived: boolean) => void;
};

function ArchiveTable({ rows, type, loading, onToggle }: TableProps) {
  if (rows.length === 0) {
    return <p className="archive-empty">No {type} found.</p>;
  }

  return (
    <table className="archive-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Details</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isArchived = !!row.archivedAt;
          const key = `${type}-${row.id}`;
          return (
            <tr key={row.id} className={isArchived ? "archive-row--archived" : ""}>
              <td className="archive-row__name">{row.name}</td>
              <td className="archive-row__subtitle">{row.subtitle}</td>
              <td>
                <span className={`archive-badge ${isArchived ? "archive-badge--archived" : "archive-badge--active"}`}>
                  {isArchived ? "Archived" : "Active"}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className={`archive-btn ${isArchived ? "archive-btn--unarchive" : "archive-btn--archive"}`}
                  disabled={loading === key}
                  onClick={() => onToggle(type, row.id, isArchived)}
                >
                  {loading === key ? "…" : isArchived ? "Unarchive" : "Archive"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
