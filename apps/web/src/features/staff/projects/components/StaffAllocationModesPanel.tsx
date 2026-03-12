"use client";

import { useState } from "react";
import { StaffRandomAllocationPreview } from "./StaffRandomAllocationPreview";
import "@/features/staff/projects/styles/staff-projects.css";

type AllocationMode = "random" | "manual" | "custom";

const MODES: Array<{ key: AllocationMode; title: string; subtitle: string }> = [
  {
    key: "random",
    title: "Random Allocation",
    subtitle:
      "Randomly distribute students into teams. Preview the distribution before applying.",
  },
  {
    key: "manual",
    title: "Manual Allocation",
    subtitle:
      "Manually assign students to teams. Select and place each student where needed.",
  },
  {
    key: "custom",
    title: "Customised Allocation",
    subtitle:
      "Distribute students into teams based on selected criteria. Results are randomised within your chosen parameters.",
  },
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
    <section className="staff-projects__team-card staff-projects__allocation-methods" aria-label="Allocation modes">
      <h2 className="staff-projects__card-title">Team Allocation Methods</h2>
      <div className="staff-projects__allocation-modes">
        {MODES.map((mode) => {
          const isOpen = openMode === mode.key;
          return (
            <article key={mode.key} className="staff-projects__team-card staff-projects__allocation-mode-card">
              <div className="staff-projects__allocation-mode-head">
                <h3 className="staff-projects__allocation-mode-title">{mode.title}</h3>
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
              <p className="staff-projects__allocation-mode-subtitle">{mode.subtitle}</p>
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
      </div>
    </section>
  );
}