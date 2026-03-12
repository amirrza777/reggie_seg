"use client";

import { useState, useTransition } from "react";
import { getManualAllocationWorkspace, type ManualAllocationWorkspace } from "@/features/projects/api/teamAllocation";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffManualAllocationPanelProps = {
  projectId: number;
};

function toStudentName(student: { firstName: string; lastName: string; email: string }) {
  const fullName = `${student.firstName} ${student.lastName}`.trim();
  return fullName.length > 0 ? fullName : student.email;
}

export function StaffManualAllocationPanel({ projectId }: StaffManualAllocationPanelProps) {
  const [workspace, setWorkspace] = useState<ManualAllocationWorkspace | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, startTransition] = useTransition();

  function loadWorkspace(openAfterLoad: boolean) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        const result = await getManualAllocationWorkspace(projectId);
        setWorkspace(result);
        if (openAfterLoad) {
          setIsWorkspaceOpen(true);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load manual allocation workspace.");
      }
    });
  }

  function handleToggleWorkspace() {
    if (isWorkspaceOpen) {
      setIsWorkspaceOpen(false);
      return;
    }
    if (workspace) {
      setIsWorkspaceOpen(true);
      return;
    }
    loadWorkspace(true);
  }

  return (
    <section className="staff-projects__manual-panel" aria-label="Manual allocation panel">
      <div className="staff-projects__manual-toolbar">
        <button
          type="button"
          className="staff-projects__allocation-btn"
          onClick={handleToggleWorkspace}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : isWorkspaceOpen ? "Close manual allocation" : "Open manual allocation"}
        </button>

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
          {workspace.students.length === 0 ? (
            <p className="staff-projects__card-sub">No students found in this module.</p>
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
                      {student.status === "ALREADY_IN_TEAM" ? "Already in a team" : "Available"}
                    </span>
                    {student.currentTeam ? (
                      <p className="staff-projects__manual-student-team">Team: {student.currentTeam.teamName}</p>
                    ) : null}
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