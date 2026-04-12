"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ModuleStudentProjectMatrixProject, ModuleStudentProjectMatrixStudent } from "../types";
import { filterBySearchQuery, normalizeSearchQuery } from "@/shared/lib/search";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";

export type StaffModuleStudentProjectMatrixProps = {
  /** Raw `[moduleId]` route param (used in links). */
  moduleRouteParam: string;
  projects: ModuleStudentProjectMatrixProject[];
  students: ModuleStudentProjectMatrixStudent[];
};

function matrixRowSearchBlob(student: ModuleStudentProjectMatrixStudent): string {
  const parts: string[] = [student.displayName, student.email];
  for (const cell of student.teamCells) {
    if (cell?.teamName) parts.push(cell.teamName);
  }
  return parts.join(" ");
}

export function StaffModuleStudentProjectMatrix({
  moduleRouteParam,
  projects,
  students,
}: StaffModuleStudentProjectMatrixProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const enc = encodeURIComponent(moduleRouteParam);

  const filteredStudents = useMemo(
    () =>
      filterBySearchQuery(students, query, {
        selectors: [matrixRowSearchBlob],
      }),
    [students, query],
  );

  const columnTemplate = [
    "minmax(10rem, 1.1fr)",
    "minmax(11rem, 1.25fr)",
    ...projects.map(() => "minmax(8.5rem, 1fr)"),
  ].join(" ");

  const headers = [
    "Student",
    "Email",
    ...projects.map((p) => (
      <Link
        key={`head-project-${p.id}`}
        href={`/staff/modules/${enc}/projects/${p.id}`}
        className="staff-module-students-matrix__project-head-link"
      >
        {p.name} ⤴︎
      </Link>
    )),
  ];

  const rows = filteredStudents.map((s) => {
    const cells = [
      s.displayName,
      s.email,
      ...s.teamCells.map((cell, idx) => {
        if (!cell) return <span className="muted">—</span>;
        const projectId = projects[idx]!.id;
        return (
          <Link
            key={`${s.userId}-${projectId}-${cell.teamId}`}
            href={`/staff/modules/${enc}/projects/${projectId}/teams/${cell.teamId}`}
            className="ui-link staff-module-students-matrix__team-link"
          >
            {cell.teamName}
          </Link>
        );
      }),
    ];
    return cells;
  });

  const hasActiveQuery = Boolean(normalizeSearchQuery(query));

  return (
    <div className="staff-module-students-matrix">
      <div className="staff-module-students-matrix__controls">
        <label htmlFor={searchId} className="enterprise-modules__create-field-label">
          Search
        </label>
        <p className="ui-note ui-note--muted" style={{ marginTop: 4 }}>
          Search for students by name, email, or team name.
        </p>
        <SearchField
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. student name, email, or team…"
          className="enterprise-modules__search"
          style={{ marginTop: 8 }}
          aria-label="Search students and team names in the matrix"
        />
        <p className="ui-note ui-note--muted" style={{ marginTop: 8 }}>
          {hasActiveQuery
            ? `Showing ${filteredStudents.length} of ${students.length} students`
            : `${students.length} student${students.length === 1 ? "" : "s"}`}
        </p>
      </div>
      <div
        className="staff-module-students-matrix__table-viewport"
        role="region"
        aria-label="Student and team matrix"
      >
        {rows.length === 0 ? (
          <p className="muted staff-module-students-matrix__empty">No students match this search.</p>
        ) : (
          <Table
            className="staff-module-students-matrix__table"
            headers={headers}
            rows={rows}
            columnTemplate={columnTemplate}
          />
        )}
      </div>
    </div>
  );
}
