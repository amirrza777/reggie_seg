"use client";

import { useState, useTransition } from "react";
import { getManualAllocationWorkspace, type ManualAllocationWorkspace } from "@/features/projects/api/teamAllocation";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffManualAllocationPanelProps = {
  projectId: number;
};

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
        </div>
      ) : null}
    </section>
  );
}