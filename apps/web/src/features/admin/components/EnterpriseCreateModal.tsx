import type { FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { ModalPortal } from "@/shared/ui/ModalPortal";

type EnterpriseCreateModalProps = {
  open: boolean;
  nameInput: string;
  codeInput: string;
  isCreating: boolean;
  onNameInputChange: (value: string) => void;
  onCodeInputChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type EnterpriseCreateModalBodyProps = Omit<EnterpriseCreateModalProps, "open">;

function EnterpriseCreateModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal__header ui-modal-header">
      <div className="ui-stack-sm">
        <h3 id="create-enterprise-title">Create enterprise</h3>
        <p className="muted">Create a new enterprise account space. You can provide a code or let it auto-generate.</p>
      </div>
      <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={onClose}>
        ×
      </Button>
    </div>
  );
}

function EnterpriseCreateFields(props: EnterpriseCreateModalBodyProps) {
  return (
    <>
      <FormField value={props.nameInput} onChange={(event) => props.onNameInputChange(event.target.value)} placeholder="Enterprise name" aria-label="Enterprise name" required />
      <FormField
        value={props.codeInput}
        onChange={(event) => props.onCodeInputChange(event.target.value.toUpperCase())}
        placeholder="Code (optional)"
        aria-label="Enterprise code"
        maxLength={16}
      />
    </>
  );
}

function EnterpriseCreateModalActions({ isCreating, onClose }: { isCreating: boolean; onClose: () => void }) {
  return (
    <div className="ui-row ui-row--end enterprise-management__create-actions">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
        Cancel
      </Button>
      <Button type="submit" disabled={isCreating}>
        {isCreating ? "Creating..." : "Create enterprise"}
      </Button>
    </div>
  );
}

function EnterpriseCreateModalBody(props: EnterpriseCreateModalBodyProps) {
  return (
    <>
      <EnterpriseCreateModalHeader onClose={props.onClose} />
      <form className="modal__body admin-modal__body enterprise-management__create" onSubmit={props.onSubmit}>
        <EnterpriseCreateFields {...props} />
        <EnterpriseCreateModalActions isCreating={props.isCreating} onClose={props.onClose} />
      </form>
    </>
  );
}

function EnterpriseCreateModalDialog(props: EnterpriseCreateModalBodyProps) {
  return (
    <div className="modal__dialog admin-modal ui-content-width enterprise-management__create-modal" onClick={(event) => event.stopPropagation()}>
      <EnterpriseCreateModalBody {...props} />
    </div>
  );
}

export function EnterpriseCreateModal(props: EnterpriseCreateModalProps) {
  if (!props.open) {
    return null;
  }
  return (
    <ModalPortal>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-enterprise-title" onClick={props.onClose}>
        <EnterpriseCreateModalDialog {...props} />
      </div>
    </ModalPortal>
  );
}
