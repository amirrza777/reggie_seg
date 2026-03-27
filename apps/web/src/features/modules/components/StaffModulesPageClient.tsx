"use client";

import { useState } from "react";
import type { Module } from "../types";
import { ModuleList } from "./ModuleList";
import type { ModuleSortKey } from "./moduleSortOptions";
import "@/features/staff/projects/styles/staff-projects.css";

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
    <div className="staff-projects staff-projects--panel-inset">
      <section className="staff-projects__hero">
        <h1 className="staff-projects__title">My Modules</h1>
        <p className="staff-projects__desc">{subtitle}</p>
      </section>
      {errorMessage ? (
        <p className="muted">{errorMessage}</p>
      ) : (
        <ModuleList
          modules={modules}
          emptyMessage="No modules are currently assigned to your account."
          sortBy={sortBy}
          onSortByChange={setSortBy}
          showSortControl={shouldShowSortControl}
          moduleHrefBasePath="/staff/modules"
        />
      )}
    </div>
  );
}
