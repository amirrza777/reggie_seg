import { Button } from "@/shared/ui/Button";
import { useEnterpriseModuleCreateFormState } from "./hooks/useEnterpriseModuleCreateFormState";

type ModuleCreateFormState = ReturnType<typeof useEnterpriseModuleCreateFormState>;

export function ModuleArchiveSection({
  state,
  moduleArchived,
}: {
  state: ModuleCreateFormState;
  moduleArchived: boolean;
}) {
  const d = state.isSubmitting || state.isDeleting || state.isArchiving;

  if (moduleArchived) {
    return (
      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
        <div className="enterprise-module-create__danger-zone">
          <h3 className="enterprise-module-create__danger-title">Unarchive module</h3>
          <p className="ui-note">
            This module is archived: students and staff see it as read-only. Unarchive to allow edits again.
          </p>
          <label htmlFor="module-unarchive-confirmation" className="enterprise-module-create__danger-confirm">
            <input
              id="module-unarchive-confirmation"
              type="checkbox"
              checked={state.confirmUnarchiveModule}
              onChange={(event) => state.setConfirmUnarchiveModule(event.target.checked)}
              disabled={d}
            />
            <span>I understand this will allow people with permission to edit the module again.</span>
          </label>
          <div className="ui-row ui-row--end">
            <Button
              type="button"
              variant="primary"
              onClick={() => void state.handleUnarchiveModule()}
              disabled={d || !state.confirmUnarchiveModule}
            >
              {state.isArchiving ? "Updating…" : "Unarchive module"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
      <div className="enterprise-module-create__danger-zone">
        <h3 className="enterprise-module-create__danger-title">Archive module</h3>
        <p className="ui-note">
          Archive the module to make it read-only for everyone with access to it (e.g. at the end of term). 
          You can unarchive it to allow for edits again.
        </p>
        <label htmlFor="module-archive-confirmation" className="enterprise-module-create__danger-confirm">
          <input
            id="module-archive-confirmation"
            type="checkbox"
            checked={state.confirmArchiveModule}
            onChange={(event) => state.setConfirmArchiveModule(event.target.checked)}
            disabled={d}
          />
          <span>I understand the module will become read-only for all users. It can be unarchived if needed.</span>
        </label>
        <div className="ui-row ui-row--end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void state.handleArchiveModule()}
            disabled={d || !state.confirmArchiveModule}
          >
            {state.isArchiving ? "Updating…" : "Archive module"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ModuleDeleteSection({ state }: { state: ModuleCreateFormState }) {
  const d = state.isSubmitting || state.isDeleting || state.isArchiving;
  return (
    <div
      className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger"
      style={{ marginTop: 16 }}
    >
      <div className="enterprise-module-create__danger-zone">
        <h3 className="enterprise-module-create__danger-title">Delete module</h3>
        <p className="ui-note">
          This permanently deletes the module and its related projects, teams, and access assignments.
        </p>
        <label htmlFor="module-delete-confirmation" className="enterprise-module-create__danger-confirm">
          <input
            id="module-delete-confirmation"
            type="checkbox"
            checked={state.confirmDeleteModule}
            onChange={(event) => state.setConfirmDeleteModule(event.target.checked)}
            disabled={d}
          />
          <span>I understand this action cannot be undone.</span>
        </label>
        <div className="ui-row ui-row--end">
          <Button
            type="button"
            variant="danger"
            onClick={state.handleDeleteModule}
            disabled={d || !state.confirmDeleteModule}
          >
            {state.isDeleting ? "Deleting..." : "Delete module"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ModuleArchiveActionNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="status-alert status-alert--success enterprise-module-create__archive-notice" role="status">
      <span>{message}</span>
    </div>
  );
}

export function ModuleErrorMessage({ errorMessage }: { errorMessage: string | null }) {
  if (!errorMessage) return null;
  return (
    <div className="status-alert status-alert--error enterprise-module-create__error">
      <span>{errorMessage}</span>
    </div>
  );
}

export function ModuleFormActions({ state }: { state: ModuleCreateFormState }) {
  const d = state.isSubmitting || state.isDeleting || state.isArchiving;
  return (
    <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
      <Button type="button" variant="ghost" onClick={state.navigateHome} disabled={d}>
        Cancel
      </Button>
      <Button type="submit" disabled={d || (!state.isEditMode && state.leaderIds.length === 0)}>
        {state.isSubmitting ? (state.isEditMode ? "Saving..." : "Creating...") : state.isEditMode ? "Save module" : "Create module"}
      </Button>
    </div>
  );
}
