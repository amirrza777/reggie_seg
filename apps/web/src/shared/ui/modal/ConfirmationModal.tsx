"use client";

import { useEffect, useId } from "react";
import { Button } from "../Button";
import { ModalPortal } from "./ModalPortal";

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

type ConfirmationModalBodyProps = {
  titleId: string;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant: "primary" | "danger";
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function useCloseOnEscape(open: boolean, busy: boolean, onCancel: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);
}

function ConfirmationModalHeader(props: Pick<ConfirmationModalBodyProps, "titleId" | "title" | "busy" | "onCancel">) {
  return (
    <div className="modal__header ui-modal-header">
      <h3 id={props.titleId}>{props.title}</h3>
      <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={props.onCancel} disabled={props.busy}>
        ×
      </Button>
    </div>
  );
}

function ConfirmationModalFooter(props: Pick<ConfirmationModalBodyProps, "busy" | "cancelLabel" | "confirmLabel" | "confirmVariant" | "onCancel" | "onConfirm">) {
  return (
    <div className="modal__footer confirmation-modal__footer ui-row ui-row--end">
      <Button type="button" variant="ghost" onClick={props.onCancel} disabled={props.busy}>
        {props.cancelLabel}
      </Button>
      <Button type="button" variant={props.confirmVariant} onClick={props.onConfirm} disabled={props.busy}>
        {props.confirmLabel}
      </Button>
    </div>
  );
}

function ConfirmationModalBody(props: ConfirmationModalBodyProps) {
  return (
    <>
      <ConfirmationModalHeader titleId={props.titleId} title={props.title} busy={props.busy} onCancel={props.onCancel} />
      <div className="modal__body confirmation-modal__body">
        <p className="confirmation-modal__message">{props.message}</p>
      </div>
      <ConfirmationModalFooter
        busy={props.busy}
        cancelLabel={props.cancelLabel}
        confirmLabel={props.confirmLabel}
        confirmVariant={props.confirmVariant}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
      />
    </>
  );
}

export function ConfirmationModal(props: ConfirmationModalProps) {
  const title = props.title ?? "Please confirm";
  const confirmLabel = props.confirmLabel ?? "Confirm";
  const cancelLabel = props.cancelLabel ?? "Cancel";
  const confirmVariant = props.confirmVariant ?? "primary";
  const busy = props.busy ?? false;
  const titleId = useId();
  useCloseOnEscape(props.open, busy, props.onCancel);
  if (!props.open) {
    return null;
  }
  return (
    <ModalPortal>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={() => !busy && props.onCancel()}>
        <div className="modal__dialog confirmation-modal ui-content-width" onClick={(event) => event.stopPropagation()}>
          <ConfirmationModalBody titleId={titleId} title={title} message={props.message} cancelLabel={cancelLabel} confirmLabel={confirmLabel} confirmVariant={confirmVariant} busy={busy} onConfirm={props.onConfirm} onCancel={props.onCancel} />
        </div>
      </div>
    </ModalPortal>
  );
}
