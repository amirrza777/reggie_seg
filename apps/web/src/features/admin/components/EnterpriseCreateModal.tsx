import type { FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

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

export function EnterpriseCreateModal({
  open,
  nameInput,
  codeInput,
  isCreating,
  onNameInputChange,
  onCodeInputChange,
  onClose,
  onSubmit,
}: EnterpriseCreateModalProps) {
  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-enterprise-title" onClick={onClose}>
      <div className="modal__dialog admin-modal ui-content-width enterprise-management__create-modal" onClick={(event) => event.stopPropagation()}>
        <EnterpriseCreateModalBody
          nameInput={nameInput}
          codeInput={codeInput}
          isCreating={isCreating}
          onNameInputChange={onNameInputChange}
          onCodeInputChange={onCodeInputChange}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

function EnterpriseCreateModalBody({
  nameInput,
  codeInput,
  isCreating,
  onNameInputChange,
  onCodeInputChange,
  onClose,
  onSubmit,
}: Omit<EnterpriseCreateModalProps, "open">) {
  return (
    <>
      <div className="modal__header ui-modal-header">
        <div className="ui-stack-sm">
          <h3 id="create-enterprise-title">Create enterprise</h3>
          <p className="muted">Create a new enterprise account space. You can provide a code or let it auto-generate.</p>
        </div>
        <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={onClose}>
          ×
        </Button>
      </div>

      <form className="modal__body admin-modal__body enterprise-management__create" onSubmit={onSubmit}>
        <FormField
          value={nameInput}
          onChange={(event) => onNameInputChange(event.target.value)}
          placeholder="Enterprise name"
          aria-label="Enterprise name"
          required
        />
        <FormField
          value={codeInput}
          onChange={(event) => onCodeInputChange(event.target.value.toUpperCase())}
          placeholder="Code (optional)"
          aria-label="Enterprise code"
          maxLength={16}
        />
        <div className="ui-row ui-row--end enterprise-management__create-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create enterprise"}
          </Button>
        </div>
      </form>
    </>
  );
}
