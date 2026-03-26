"use client";

import { useEffect, useId, useState } from "react";
import "../styles/title-info.css";

type PeerAssessmentTitleWithInfoProps = {
  title?: string;
};

export function PeerAssessmentTitleWithInfo({
  title = "Peer Assessments",
}: PeerAssessmentTitleWithInfoProps) {
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
      <span className="peer-assessment-title-with-info">
        <span>{title}</span>
        <button
          type="button"
          className="peer-assessment-title-with-info__button"
          aria-label="What is peer assessment?"
          title="What is peer assessment?"
          onClick={() => setOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="8.6" />
            <path d="M12 10.1v5.5" />
            <circle cx="12" cy="7.4" r="1" fill="currentColor" stroke="none" />
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
            className="modal__dialog peer-assessment-info-modal ui-content-width"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <h3 id={modalTitleId} className="peer-assessment-info-modal__title">
                <span>Peer assessments</span>
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
            <div className="modal__body peer-assessment-info-modal__body">
              <p>
                Peer assessment is where you evaluate your teammates&apos; contribution and collaboration
                during the project lifecycle. Your comments should reflect observed contribution quality,
                communication, and reliability.
              </p>
              <p>
                These responses help create a fairer evidence base for team contribution. Staff may use
                the submitted reviews as supporting context during moderation and feedback discussions.
              </p>
              <p>
                Submit clear, professional feedback that focuses on behavior and delivery outcomes. Avoid
                personal language and keep your assessment factual and constructive.
              </p>
            </div>
            <div className="modal__footer peer-assessment-info-modal__footer">
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
