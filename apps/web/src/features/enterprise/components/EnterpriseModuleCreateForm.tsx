"use client";

import { Button } from "@/shared/ui/Button";
import { MeetingSettingsSection } from "./MeetingSettingsSection";
import { useEnterpriseModuleCreateFormState } from "./hooks/useEnterpriseModuleCreateFormState";
import {
  fieldsetResetStyle,
  ModuleCodeField,
  ModuleEditBlockedNotice,
  ModuleEditFieldsSection,
  ModuleEditModeAccessSections,
  ModuleFormCollapsible,
  ModuleJoinCodeField,
  ModuleLeaderAccessSection,
  ModuleNameField,
  useCurrentUserId,
  type ModuleCreateFormState,
} from "./EnterpriseModuleCreateForm.shared";
import {
  ModuleArchiveActionNotice,
  ModuleArchiveSection,
  ModuleDeleteSection,
  ModuleErrorMessage,
  ModuleFormActions,
} from "./EnterpriseModuleCreateForm.archive.shared";

type EnterpriseModuleCreateFormProps = {
  mode?: "create" | "edit";
  moduleId?: number;
  workspace?: "enterprise" | "staff";
  joinCode?: string | null;
  created?: boolean;
  successRedirectAfterUpdateHref?: string;
};

export function EnterpriseModuleCreateForm({
  mode = "create",
  moduleId,
  workspace = "enterprise",
  joinCode = null,
  created = false,
  successRedirectAfterUpdateHref,
}: EnterpriseModuleCreateFormProps) {
  const state = useEnterpriseModuleCreateFormState({
    mode,
    moduleId,
    workspace,
    successRedirectAfterUpdateHref,
  });

  if (state.isLoadingAccess) {
    return <p className="muted">Loading module access options...</p>;
  }

  if (state.isEditMode && !state.canEditModule && !state.moduleArchived) {
    return <ModuleEditBlockedNotice state={state} />;
  }

  return (
    <EnterpriseModuleCreateFormBody
      state={state}
      moduleId={moduleId}
      joinCode={joinCode}
      created={created}
    />
  );
}

function EnterpriseModuleCreateFormBody({
  state,
  moduleId,
  joinCode,
  created,
}: {
  state: ModuleCreateFormState;
  moduleId?: number;
  joinCode?: string | null;
  created: boolean;
}) {
  const currentUserId = useCurrentUserId();
  const readOnlyArchived = Boolean(state.isEditMode && state.moduleArchived);

  return (
    <form className="enterprise-modules__create-form enterprise-module-create__form" onSubmit={state.handleSubmit} noValidate>
      <ModuleFormCollapsible title="Module details" defaultOpen={!readOnlyArchived}>
        <fieldset disabled={readOnlyArchived} style={fieldsetResetStyle}>
          <ModuleNameField state={state} />
          <ModuleCodeField state={state} />
        </fieldset>
        {state.isEditMode && moduleId != null ? <ModuleJoinCodeField joinCode={joinCode ?? null} created={created} /> : null}
      </ModuleFormCollapsible>

      <ModuleFormCollapsible
        title={state.isEditMode ? "Module content" : "After you create"}
        defaultOpen={!state.isEditMode && !readOnlyArchived}
      >
        <fieldset disabled={readOnlyArchived} style={fieldsetResetStyle}>
          <ModuleEditFieldsSection state={state} />
        </fieldset>
      </ModuleFormCollapsible>

      <ModuleFormCollapsible title="User access">
        <fieldset disabled={readOnlyArchived} style={fieldsetResetStyle}>
          <ModuleLeaderAccessSection state={state} currentUserId={currentUserId} />
          {state.isEditMode ? <ModuleEditModeAccessSections state={state} /> : null}
        </fieldset>
      </ModuleFormCollapsible>

      {state.isEditMode && moduleId ? (
        <ModuleFormCollapsible title="Meeting & attendance settings">
          <fieldset disabled={readOnlyArchived} style={fieldsetResetStyle}>
            <div className="enterprise-module-create__field enterprise-module-create__field--meeting-settings">
              <MeetingSettingsSection moduleId={moduleId} />
            </div>
          </fieldset>
        </ModuleFormCollapsible>
      ) : null}

      {state.isEditMode && moduleId != null ? (
        <ModuleFormCollapsible title="Archive or delete module" defaultOpen={readOnlyArchived}>
          <ModuleArchiveActionNotice message={state.archiveActionNotice} />
          <ModuleArchiveSection state={state} moduleArchived={state.moduleArchived} />
          <ModuleDeleteSection state={state} />
        </ModuleFormCollapsible>
      ) : null}

      <ModuleErrorMessage errorMessage={state.errorMessage} />
      {readOnlyArchived ? (
        <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
          <Button
            type="button"
            variant="ghost"
            onClick={state.navigateHome}
            disabled={state.isSubmitting || state.isDeleting || state.isArchiving}
          >
            Back
          </Button>
        </div>
      ) : (
        <ModuleFormActions state={state} />
      )}
    </form>
  );
}
