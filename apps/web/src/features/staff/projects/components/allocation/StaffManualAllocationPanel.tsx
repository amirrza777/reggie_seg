"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyManualAllocation,
  getManualAllocationWorkspace,
  type ManualAllocationWorkspace,
} from "@/features/projects/api/teamAllocation";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { SearchField } from "@/shared/ui/SearchField";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffManualAllocationPanelProps = {
  projectId: number;
};

function toStudentName(student: { firstName: string; lastName: string; email: string }) {
  const fullName = `${student.firstName} ${student.lastName}`.trim();
  return fullName.length > 0 ? fullName : student.email;
}

export function StaffManualAllocationPanel({ projectId }: StaffManualAllocationPanelProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<ManualAllocationWorkspace | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [formNotice, setFormNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, startTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const latestWorkspaceRequestRef = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSearchDebounceTimer() {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  }

  useEffect(() => () => clearSearchDebounceTimer(), []);

  async function fetchWorkspaceForQuery(query: string) {
    if (query.length > 0) {
      return await getManualAllocationWorkspace(projectId, query);
    }
    return await getManualAllocationWorkspace(projectId);
  }

  function applyWorkspaceState(
    result: ManualAllocationWorkspace,
    preserveSelection: boolean,
    openAfterLoad: boolean,
  ) {
    setWorkspace(result);
    if (preserveSelection) {
      const availableStudentIds = new Set(
        result.students.filter((student) => student.status === "AVAILABLE").map((student) => student.id),
      );
      setSelectedStudentIds((current) => current.filter((studentId) => availableStudentIds.has(studentId)));
    } else {
      setSelectedStudentIds([]);
      setTeamNameInput("");
    }
    setFormNotice(null);
    if (openAfterLoad) {
      setIsWorkspaceOpen(true);
    }
  }

  function setWorkspaceLoadError(error: unknown) {
    setErrorMessage(error instanceof Error ? error.message : "Failed to load manual allocation workspace.");
  }

  function loadWorkspace(
    openAfterLoad: boolean,
    options: { query?: string; preserveSelection?: boolean } = {},
  ) {
    const normalizedQuery =
      typeof options.query === "string" ? options.query.trim() : studentSearchInput.trim();
    setErrorMessage("");
    const requestId = latestWorkspaceRequestRef.current + 1;
    latestWorkspaceRequestRef.current = requestId;
    startTransition(async () => {
      try {
        const result = await fetchWorkspaceForQuery(normalizedQuery);
        if (latestWorkspaceRequestRef.current !== requestId) {
          return;
        }
        applyWorkspaceState(result, Boolean(options.preserveSelection), openAfterLoad);
      } catch (error) {
        if (latestWorkspaceRequestRef.current !== requestId) {
          return;
        }
        setWorkspaceLoadError(error);
      }
    });
  }

  function handleToggleWorkspace() {
    if (isWorkspaceOpen) {
      clearSearchDebounceTimer();
      setIsWorkspaceOpen(false);
      return;
    }
    if (workspace) {
      setIsWorkspaceOpen(true);
      return;
    }
    loadWorkspace(true, { query: studentSearchInput });
  }

  function handleRefreshWorkspace() {
    clearSearchDebounceTimer();
    loadWorkspace(isWorkspaceOpen, { query: studentSearchInput });
  }

  const isBusy = isLoading || isSubmitting;

  const availableStudentIds = workspace
    ? workspace.students.filter((student) => student.status === "AVAILABLE").map((student) => student.id)
    : [];

  function selectAllAvailableStudents() {
    setSelectedStudentIds(availableStudentIds);
    setFormNotice(null);
  }

  function clearSelectedStudents() {
    setSelectedStudentIds([]);
    setFormNotice(null);
  }

  function toggleStudentSelection(studentId: number) {
    setSelectedStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
    setFormNotice(null);
  }

  function handlePrepareTeamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTeamName = teamNameInput.trim();
    if (trimmedTeamName.length === 0) {
      setFormNotice({ type: "error", text: "Enter a team name." });
      return;
    }
    if (selectedStudentIds.length === 0) {
      setFormNotice({ type: "error", text: "Select at least one available student." });
      return;
    }

    const submissionStudentIds = [...selectedStudentIds];
    setFormNotice(null);
    setErrorMessage("");

    startSubmitTransition(async () => {
      try {
        const applied = await applyManualAllocation(projectId, trimmedTeamName, submissionStudentIds);
        setSelectedStudentIds([]);
        setTeamNameInput("");
        setFormNotice({
          type: "success",
          text: `Saved draft "${applied.team.teamName}" with ${applied.team.memberCount} student${applied.team.memberCount === 1 ? "" : "s"}.`,
        });

        try {
          const trimmedQuery = studentSearchInput.trim();
          const refreshedWorkspace =
            trimmedQuery.length > 0
              ? await getManualAllocationWorkspace(projectId, trimmedQuery)
              : await getManualAllocationWorkspace(projectId);
          setWorkspace(refreshedWorkspace);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? `Draft saved, but workspace refresh failed: ${error.message}`
              : "Draft saved, but workspace refresh failed.",
          );
        }

        emitStaffAllocationDraftsRefresh();
        router.refresh();
      } catch (error) {
        setFormNotice({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to save draft team.",
        });
      }
    });
  }

  function resetManualForm() {
    setTeamNameInput("");
    setSelectedStudentIds([]);
    setFormNotice(null);
  }

  function handleStudentSearchChange(nextValue: string) {
    setStudentSearchInput(nextValue);
    clearSearchDebounceTimer();

    if (!isWorkspaceOpen || !workspace) {
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      loadWorkspace(true, {
        query: nextValue,
        preserveSelection: true,
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <section className="staff-projects__manual-panel" aria-label="Manual allocation panel">
      <div className="staff-projects__manual-toolbar">
        <div className="staff-projects__manual-toolbar-actions">
          <button
            type="button"
            className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
            onClick={handleToggleWorkspace}
            disabled={isBusy}
          >
            {isLoading ? "Loading..." : isWorkspaceOpen ? "Close manual allocation" : "Open manual allocation"}
          </button>
          {workspace ? (
            <button
              type="button"
              className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
              onClick={handleRefreshWorkspace}
              disabled={isBusy}
            >
              {isLoading ? "Refreshing..." : "Refresh list"}
            </button>
          ) : null}
        </div>

        {workspace ? (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">{workspace.counts.totalStudents} students</span>
            <span className="staff-projects__badge">{workspace.counts.availableStudents} available</span>
            <span className="staff-projects__badge">{workspace.counts.alreadyInTeamStudents} already in a team</span>
          </div>
        ) : null}
      </div>

      {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}

      {isWorkspaceOpen && workspace ? (
        <div className="staff-projects__manual-workspace-card" aria-label="Manual allocation workspace">
          <h4 className="staff-projects__manual-workspace-title">Manual allocation workspace</h4>
          <div className="staff-projects__manual-selection-toolbar">
            <span className="staff-projects__badge">{selectedStudentIds.length} selected</span>
            <div className="staff-projects__manual-selection-actions">
              <button
                type="button"
                className="staff-projects__allocation-btn"
                onClick={selectAllAvailableStudents}
                disabled={isBusy || availableStudentIds.length === 0}
              >
                Select all available
              </button>
              <button
                type="button"
                className="staff-projects__allocation-btn"
                onClick={clearSelectedStudents}
                disabled={isBusy || selectedStudentIds.length === 0}
              >
                Clear selection
              </button>
            </div>
          </div>

          <form className="staff-projects__manual-create-form" onSubmit={handlePrepareTeamSubmit}>
            <label className="staff-projects__manual-create-field">
              Team name
              <input
                type="text"
                value={teamNameInput}
                onChange={(event) => {
                  setTeamNameInput(event.target.value);
                  setFormNotice(null);
                }}
                disabled={isBusy}
                placeholder="e.g. Team Gamma"
                aria-label="Manual team name"
              />
            </label>
            <div className="staff-projects__manual-create-actions">
              <button
                type="submit"
                className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                disabled={isBusy}
              >
                {isSubmitting ? "Saving draft..." : "Create draft team"}
              </button>
              <button
                type="button"
                className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                onClick={resetManualForm}
                disabled={isBusy}
              >
                Reset form
              </button>
            </div>
            <label className="staff-projects__manual-create-field">
              Search students
              <SearchField
                value={studentSearchInput}
                onChange={(event) => handleStudentSearchChange(event.target.value)}
                disabled={isBusy}
                placeholder="Search by name or email"
                aria-label="Search students"
              />
            </label>
          </form>

          {formNotice ? (
            <p className={formNotice.type === "error" ? "staff-projects__allocation-error" : "staff-projects__allocation-success"}>
              {formNotice.text}
            </p>
          ) : null}

          {workspace.students.length === 0 ? (
            <p className="staff-projects__card-sub">
              {studentSearchInput.trim().length > 0
                ? `No students match "${studentSearchInput.trim()}".`
                : "No students found in this module."}
            </p>
          ) : (
            <div className="staff-projects__manual-student-list" role="list" aria-label="Manual allocation student list">
              {workspace.students.map((student) => (
                <article key={student.id} className="staff-projects__manual-student-row" role="listitem">
                  <div className="staff-projects__manual-student-main">
                    <p className="staff-projects__manual-student-name">{toStudentName(student)}</p>
                    <p className="staff-projects__manual-student-email">{student.email}</p>
                  </div>
                  <div className="staff-projects__manual-student-side">
                    <span
                      className={
                        student.status === "ALREADY_IN_TEAM"
                          ? "staff-projects__manual-status staff-projects__manual-status--assigned"
                          : "staff-projects__manual-status staff-projects__manual-status--available"
                      }
                    >
                      {student.status === "ALREADY_IN_TEAM" ? "Already assigned" : "Available"}
                    </span>
                    {student.currentTeam ? (
                      <p className="staff-projects__manual-student-team">Team: {student.currentTeam.teamName}</p>
                    ) : null}
                    <button
                      type="button"
                      className={
                        selectedStudentIds.includes(student.id)
                          ? "staff-projects__manual-select-btn staff-projects__manual-select-btn--active"
                          : "staff-projects__manual-select-btn"
                      }
                      onClick={() => toggleStudentSelection(student.id)}
                      disabled={isBusy || student.status !== "AVAILABLE"}
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
      ) : null}
    </section>
  );
}
