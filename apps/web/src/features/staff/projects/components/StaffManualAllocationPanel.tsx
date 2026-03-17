"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyManualAllocation,
  getManualAllocationWorkspace,
  type ManualAllocationWorkspace,
} from "@/features/projects/api/teamAllocation";
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [teamNameInput, setTeamNameInput] = useState("");
  const [formNotice, setFormNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, startTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const latestWorkspaceRequestRef = useRef(0);

  function loadWorkspace(
    openAfterLoad: boolean,
    options?: { query?: string; resetForm?: boolean; preserveSelection?: boolean },
  ) {
    setErrorMessage("");
    const requestId = latestWorkspaceRequestRef.current + 1;
    latestWorkspaceRequestRef.current = requestId;
    startTransition(async () => {
      try {
        const normalizedQuery = options?.query?.trim();
        const result = normalizedQuery
          ? await getManualAllocationWorkspace(projectId, { query: normalizedQuery })
          : await getManualAllocationWorkspace(projectId);
        if (latestWorkspaceRequestRef.current !== requestId) {
          return;
        }
        setWorkspace(result);
        if (options?.resetForm !== false) {
          setSelectedStudentIds([]);
          setTeamNameInput("");
          setFormNotice(null);
        } else if (options?.preserveSelection) {
          const scopedStudentIds = new Set(result.students.map((student) => student.id));
          setSelectedStudentIds((current) => current.filter((studentId) => scopedStudentIds.has(studentId)));
        }
        if (openAfterLoad) {
          setIsWorkspaceOpen(true);
        }
      } catch (error) {
        if (latestWorkspaceRequestRef.current !== requestId) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Failed to load manual allocation workspace.");
      }
    });
  }

  function handleToggleWorkspace() {
    if (isWorkspaceOpen) {
      setIsWorkspaceOpen(false);
      setStudentSearchQuery("");
      return;
    }
    if (workspace) {
      setIsWorkspaceOpen(true);
      return;
    }
    loadWorkspace(true, { query: studentSearchQuery });
  }

  function handleRefreshWorkspace() {
    loadWorkspace(isWorkspaceOpen, {
      query: studentSearchQuery,
      resetForm: false,
      preserveSelection: true,
    });
  }

  const isBusy = isLoading || isSubmitting;

  useEffect(() => {
    if (!isWorkspaceOpen || !workspace) {
      return;
    }
    const timer = window.setTimeout(() => {
      loadWorkspace(true, {
        query: studentSearchQuery,
        resetForm: false,
        preserveSelection: true,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isWorkspaceOpen, studentSearchQuery]);

  const filteredStudents = workspace?.students ?? [];

  const availableStudentIds = filteredStudents
    .filter((student) => student.status === "AVAILABLE")
    .map((student) => student.id);

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
          text: `Created "${applied.team.teamName}" with ${applied.team.memberCount} student${applied.team.memberCount === 1 ? "" : "s"}.`,
        });

        try {
          const refreshedQuery = studentSearchQuery.trim();
          const refreshedWorkspace = refreshedQuery
            ? await getManualAllocationWorkspace(projectId, { query: refreshedQuery })
            : await getManualAllocationWorkspace(projectId);
          setWorkspace(refreshedWorkspace);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? `Team created, but workspace refresh failed: ${error.message}`
              : "Team created, but workspace refresh failed.",
          );
        }

        router.refresh();
      } catch (error) {
        setFormNotice({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to create team.",
        });
      }
    });
  }

  function resetManualForm() {
    setTeamNameInput("");
    setSelectedStudentIds([]);
    setFormNotice(null);
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

          <label className="staff-projects__field" htmlFor="manual-allocation-student-search">
            <span className="staff-projects__field-label">Search students</span>
            <input
              id="manual-allocation-student-search"
              type="search"
              className="staff-projects__input"
              value={studentSearchQuery}
              onChange={(event) => setStudentSearchQuery(event.target.value)}
              placeholder="Search by name, email, or team"
              aria-label="Search students in manual allocation workspace"
            />
          </label>

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
                {isSubmitting ? "Creating..." : "Create team"}
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
          </form>

          {formNotice ? (
            <p className={formNotice.type === "error" ? "staff-projects__allocation-error" : "staff-projects__allocation-success"}>
              {formNotice.text}
            </p>
          ) : null}

          {workspace.students.length === 0 ? (
            <p className="staff-projects__card-sub">No students found in this module.</p>
          ) : filteredStudents.length === 0 ? (
            <p className="staff-projects__card-sub">No students match "{studentSearchQuery.trim()}".</p>
          ) : (
            <div className="staff-projects__manual-student-list" role="list" aria-label="Manual allocation student list">
              {filteredStudents.map((student) => (
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
                      {student.status === "ALREADY_IN_TEAM" ? "Already in a team" : "Available"}
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
