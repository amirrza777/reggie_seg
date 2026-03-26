"use client";

import { useEffect, useId, useState } from "react";
import "../styles/team-health-title-info.css";

type ProjectTeamHealthTitleWithInfoProps = {
  title?: string;
};

export function ProjectTeamHealthTitleWithInfo({
  title = "Team Health",
}: ProjectTeamHealthTitleWithInfoProps) {
  const [open, setOpen] = useState(false);
  const modalTitleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <span className="team-health-title-with-info">
        <span>{title}</span>
        <button
          type="button"
          className="team-health-title-with-info__button"
          aria-label="What is team health?"
          title="What is team health?"
          onClick={() => setOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="8.6" />
            <path d="M12 10.1v5.5" />
            <circle cx="12" cy="7.4" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </span>

      {open ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="modal__dialog team-health-info-modal ui-content-width"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <h3 id={modalTitleId} className="team-health-info-modal__title">
                <span>Team health</span>
              </h3>
              <button
                type="button"
                className="modal__close-btn"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal__body team-health-info-modal__body">
              <p>
                Team health gives you a quick view of warnings and support messages for your team in this
                project.
              </p>
              <p>
                Warnings are generated from project warning rules set by staff, for example low meeting
                activity or low contribution signals.
              </p>
              <p>
                Use messages to raise concerns, ask for support, and track staff responses in one place.
              </p>
            </div>
            <div className="modal__footer team-health-info-modal__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

