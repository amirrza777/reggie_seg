"use client";

import type { ModuleStudent } from "@/features/modules/types";
import { SearchField } from "@/shared/ui/SearchField";
import { toStudentName } from "./useStaffProjectCreatePanel";

type Props = {
  enrolledModuleStudents: ModuleStudent[];
  filteredModuleStudents: ModuleStudent[];
  selectedStudentIds: number[];
  studentSearchInput: string;
  isLoadingModuleStudents: boolean;
  moduleStudentsError: string | null;
  onRefresh: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleStudent: (studentId: number) => void;
  onSearchChange: (value: string) => void;
};

export function StaffProjectCreatePanelStudentPicker({
  enrolledModuleStudents,
  filteredModuleStudents,
  selectedStudentIds,
  studentSearchInput,
  isLoadingModuleStudents,
  moduleStudentsError,
  onRefresh,
  onSelectAll,
  onClearSelection,
  onToggleStudent,
  onSearchChange,
}: Props) {
  return (
    <section className="staff-projects__manual-panel" aria-label="Project student selection">
      <div className="staff-projects__manual-toolbar">
        <div className="staff-projects__manual-toolbar-actions">
          <button
            type="button"
            className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
            onClick={onRefresh}
            disabled={isLoadingModuleStudents}
          >
            {isLoadingModuleStudents ? "Loading..." : "Refresh list"}
          </button>
        </div>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{enrolledModuleStudents.length} enrolled</span>
          <span className="staff-projects__badge">{selectedStudentIds.length} selected</span>
        </div>
      </div>

      {moduleStudentsError ? (
        <p className="staff-projects__allocation-error">{moduleStudentsError}</p>
      ) : null}

      <div className="staff-projects__manual-workspace-card" aria-label="Project student selection list">
        <h4 className="staff-projects__manual-workspace-title">Project student selection</h4>
        <div className="staff-projects__manual-selection-toolbar">
          <span className="staff-projects__badge">{selectedStudentIds.length} selected</span>
          <div className="staff-projects__manual-selection-actions">
            <button
              type="button"
              className="staff-projects__allocation-btn"
              onClick={onSelectAll}
              disabled={isLoadingModuleStudents || enrolledModuleStudents.length === 0}
            >
              Select all students in module
            </button>
            <button
              type="button"
              className="staff-projects__allocation-btn"
              onClick={onClearSelection}
              disabled={isLoadingModuleStudents || selectedStudentIds.length === 0}
            >
              Clear selection
            </button>
          </div>
        </div>

        <label className="staff-projects__manual-create-field">
          Search students
          <SearchField
            value={studentSearchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            disabled={isLoadingModuleStudents}
            placeholder="Search by name, email, or ID"
            aria-label="Search module students"
          />
        </label>

        {filteredModuleStudents.length === 0 ? (
          <p className="staff-projects__card-sub">
            {studentSearchInput.trim().length > 0
              ? `No students match "${studentSearchInput.trim()}".`
              : "No enrolled students found for this module."}
          </p>
        ) : (
          <div className="staff-projects__manual-student-list" role="list" aria-label="Module student list">
            {filteredModuleStudents.map((student) => (
              <article key={student.id} className="staff-projects__manual-student-row" role="listitem">
                <div className="staff-projects__manual-student-main">
                  <p className="staff-projects__manual-student-name">{toStudentName(student)}</p>
                  <p className="staff-projects__manual-student-email">{student.email}</p>
                </div>
                <div className="staff-projects__manual-student-side">
                  <button
                    type="button"
                    className={
                      selectedStudentIds.includes(student.id)
                        ? "staff-projects__manual-select-btn staff-projects__manual-select-btn--active"
                        : "staff-projects__manual-select-btn"
                    }
                    onClick={() => onToggleStudent(student.id)}
                    disabled={isLoadingModuleStudents}
                    aria-pressed={selectedStudentIds.includes(student.id)}
                  >
                    {selectedStudentIds.includes(student.id) ? "Selected" : "Select"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}