"use client";

import { useEffect, useId, useState } from "react";
import "./title-with-info-modal.css";

export type InfoIconModalProps = {
  buttonLabel: string;
  modalTitle: string;
  paragraphs: string[];
  iconStrokeWidth?: number;
};

export function InfoIconModal({
  buttonLabel,
  modalTitle,
  paragraphs,
  iconStrokeWidth = 2.1,
}: InfoIconModalProps) {
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
      <button
        type="button"
        className="title-info__button"
        aria-label={buttonLabel}
        title={buttonLabel}
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={iconStrokeWidth}
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

      {open ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="modal__dialog title-info-modal ui-content-width"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <h3 id={modalTitleId} className="title-info-modal__title">
                <span>{modalTitle}</span>
              </h3>
              <button type="button" className="modal__close-btn" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal__body title-info-modal__body">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="modal__footer title-info-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
