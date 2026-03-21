"use client";

import Link from "next/link";
import { useState } from "react";
import type { Module } from "../types";
import { ModuleList } from "./ModuleList";
import { MODULE_SORT_OPTIONS, type ModuleSortKey } from "./moduleSortOptions";

type StaffModulesPageClientProps = {
  modules: Module[];
  subtitle: string;
  errorMessage: string | null;
};

export function StaffModulesPageClient({
  modules,
  subtitle,
  errorMessage,
}: StaffModulesPageClientProps) {
  const [sortBy, setSortBy] = useState<ModuleSortKey>("alphabetical");
  const shouldShowSortControl = !errorMessage && modules.length > 0;

  return (
    <div className="stack ui-page projects-panel">
      <header className="projects-panel__header">
        <h1 className="projects-panel__title">My Modules</h1>
        <p className="projects-panel__subtitle">{subtitle}</p>
        <div className="staff-projects__meta staff-modules__meta-row">
          <Link href="/staff/projects" className="staff-projects__badge">
            Open staff projects
          </Link>
          {shouldShowSortControl ? <StaffModulesSortControl sortBy={sortBy} setSortBy={setSortBy} /> : null}
        </div>
      </header>
      {errorMessage ? (
        <p className="muted">{errorMessage}</p>
      ) : (
        <ModuleList
          modules={modules}
          emptyMessage="No modules are currently assigned to your account."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          showSortControl={false}
        />
      )}
    </div>
  );
}

function StaffModulesSortControl({
  sortBy,
  setSortBy,
}: {
  sortBy: ModuleSortKey;
  setSortBy: (value: ModuleSortKey) => void;
}) {
  return (
    <div className="module-list__toolbar module-list__toolbar--inline">
      <label htmlFor="module-list-sort" className="module-list__sort-label">
        Sort by
      </label>
      <select
        id="module-list-sort"
        className="module-list__sort-select"
        value={sortBy}
        onChange={(event) => setSortBy(event.target.value as ModuleSortKey)}
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
