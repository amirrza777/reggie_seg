"use client";

import { useEffect, useId } from "react";
import { Button } from "./Button";

type ConfirmationModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  open,
  title = "Please confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={() => !busy && onCancel()}>
      <div className="modal__dialog confirmation-modal ui-content-width" onClick={(event) => event.stopPropagation()}>
        <ConfirmationModalBody
          titleId={titleId}
          title={title}
          message={message}
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          confirmVariant={confirmVariant}
          busy={busy}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

function ConfirmationModalBody({
  titleId,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmVariant,
  busy,
  onConfirm,
  onCancel,
}: {
  titleId: string;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant: "primary" | "danger";
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="modal__header ui-modal-header">
        <h3 id={titleId}>{title}</h3>
        <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={onCancel} disabled={busy}>
          ×
        </Button>
      </div>
      <div className="modal__body confirmation-modal__body">
        <p className="confirmation-modal__message">{message}</p>
      </div>
      <div className="modal__footer confirmation-modal__footer ui-row ui-row--end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </>
  );
}
