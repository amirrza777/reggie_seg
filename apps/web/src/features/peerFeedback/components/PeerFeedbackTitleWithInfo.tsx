"use client";

import { useEffect, useId, useState } from "react";
import "../styles/title-info.css";

type PeerFeedbackTitleWithInfoProps = {
  title?: string;
};

export function PeerFeedbackTitleWithInfo({
  title = "Peer Feedback",
}: PeerFeedbackTitleWithInfoProps) {
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
      <span className="peer-feedback-title-with-info">
        <span>{title}</span>
        <button
          type="button"
          className="peer-feedback-title-with-info__button"
          aria-label="What is peer feedback?"
          title="What is peer feedback?"
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
            className="modal__dialog peer-feedback-info-modal ui-content-width"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <h3 id={modalTitleId} className="peer-feedback-info-modal__title">
                <span>Peer feedback</span>
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
            <div className="modal__body peer-feedback-info-modal__body">
              <p>
                Peer feedback is where you respond to the reviews your teammates submitted about your
                contribution and collaboration during the project.
              </p>
              <p>
                Your response helps provide context and supports a fairer understanding of team dynamics
                during moderation and staff review.
              </p>
              <p>
                Keep responses professional and specific. Focus on clarifying context, acknowledging useful
                feedback, and outlining improvements where relevant.
              </p>
            </div>
            <div className="modal__footer peer-feedback-info-modal__footer">
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

