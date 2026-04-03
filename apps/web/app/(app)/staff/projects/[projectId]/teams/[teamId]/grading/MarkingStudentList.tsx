"use client";

import { useState } from "react";
import Link from "next/link";
import type { ModuleSummary } from "@/features/staff/peerAssessments/api/client";

type Props = {
  students: ModuleSummary[];
  moduleId: number;
  projectId: number;
  teamId: number;
  readOnly?: boolean;
};

export function MarkingStudentList({ students, moduleId, projectId, teamId, readOnly = false }: Props) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const filtered = trimmed
    ? students.filter((s) => s.title.toLowerCase().includes(trimmed))
    : students;

  return (
    <section className="staff-projects__team-list" aria-label="Student marking drill down">
      <article className="staff-projects__team-card">
        <h3 className="staff-projects__team-title" style={{ margin: 0 }}>Student marking detail</h3>
        <p className="staff-projects__team-count">
          {readOnly
            ? "Individual marks are read-only while this module is archived."
            : "You can still open any student to view individual marks and formative feedback."}
        </p>
      </article>

      <div className="staff-projects__search" style={{ marginTop: 0 }}>
        <label className="staff-projects__search-label" htmlFor="marking-student-search">
          Search students
        </label>
        <div className="staff-projects__search-controls">
          <input
            id="marking-student-search"
            type="search"
            className="staff-projects__search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            autoComplete="off"
          />
          {trimmed ? (
            <button
              type="button"
              className="staff-projects__badge staff-projects__search-btn"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted">No students match &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        filtered.map((student) => (
          <article key={student.id ?? student.title} className="staff-projects__team-card">
            <div className="staff-projects__team-top">
              <h3 className="staff-projects__team-title">{student.title}</h3>
            </div>
            {student.id == null ? (
              <p className="muted" style={{ margin: 0 }}>Student identifier unavailable.</p>
            ) : (
              <Link
                href={`/staff/modules/${encodeURIComponent(String(moduleId))}/projects/${projectId}/teams/${teamId}/peer-assessment/${student.id}`}
                className="pill-nav__link staff-projects__team-action"
              >
                {readOnly ? "View student" : "Open student marking"}
              </Link>
            )}
          </article>
        ))
      )}
    </section>
  );
}
