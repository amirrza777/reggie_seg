"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";

type StaffProjectWarningsConfigPanelProps = {
  projectId: number;
};

export function StaffProjectWarningsConfigPanel({
  projectId,
}: StaffProjectWarningsConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        Configure warnings
      </Button>

      {isOpen ? (
        <div
          className="staff-projects__config-modal-backdrop"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="staff-projects__config-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-project-warning-config-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="staff-projects__config-modal-head">
              <h3 id="staff-project-warning-config-title" style={{ margin: 0 }}>
                Configure warnings for project {projectId}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </header>

            <div className="staff-projects__config-modal-body">
              <p className="muted" style={{ margin: 0 }}>
                Set project-level warning rules that apply to all teams.
              </p>
              <div className="staff-projects__config-preview-grid">
                <article className="staff-projects__config-preview-card">
                  <h4 style={{ margin: 0 }}>Low attendance</h4>
                  <p className="muted" style={{ margin: 0 }}>
                    Define attendance thresholds that create warnings.
                  </p>
                </article>
                <article className="staff-projects__config-preview-card">
                  <h4 style={{ margin: 0 }}>Low meeting frequency</h4>
                  <p className="muted" style={{ margin: 0 }}>
                    Set minimum meeting cadence expectations.
                  </p>
                </article>
                <article className="staff-projects__config-preview-card">
                  <h4 style={{ margin: 0 }}>Low contribution activity</h4>
                  <p className="muted" style={{ margin: 0 }}>
                    Configure contribution-level criteria for warnings.
                  </p>
                </article>
              </div>
            </div>

            <footer className="staff-projects__config-modal-actions">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled>
                Save config (coming soon)
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
