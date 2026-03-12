"use client";

import { useState } from "react";
import { StaffRandomAllocationPreview } from "./StaffRandomAllocationPreview";
import "@/features/staff/projects/styles/staff-projects.css";

type AllocationMode = "random" | "manual" | "custom";

const MODES: Array<{ key: AllocationMode; title: string }> = [
  { key: "random", title: "Random allocation" },
  { key: "manual", title: "Manual allocation" },
  { key: "custom", title: "Customised allocation" },
];

type StaffAllocationModesPanelProps = {
  projectId: number;
  initialTeamCount: number;
};

export function StaffAllocationModesPanel({
  projectId,
  initialTeamCount,
}: StaffAllocationModesPanelProps) {
  const [openMode, setOpenMode] = useState<AllocationMode | null>(null);

  return (
    <section className="staff-projects__allocation-modes" aria-label="Allocation modes">
      {MODES.map((mode) => {
        const isOpen = openMode === mode.key;
        return (
          <article key={mode.key} className="staff-projects__team-card staff-projects__allocation-mode-card">
            <div className="staff-projects__allocation-mode-head">
              <h2 className="staff-projects__card-title">{mode.title}</h2>
              <button
                type="button"
                className="staff-projects__allocation-mode-toggle"
                onClick={() => setOpenMode((value) => (value === mode.key ? null : mode.key))}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${mode.title}`}
              >
                {isOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {isOpen ? (
              <div className="staff-projects__allocation-mode-body">
                {mode.key === "random" ? (
                  <StaffRandomAllocationPreview
                    projectId={projectId}
                    initialTeamCount={initialTeamCount}
                    embedded
                  />
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}