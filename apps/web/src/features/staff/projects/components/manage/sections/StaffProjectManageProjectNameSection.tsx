"use client";

import type { CSSProperties } from "react";
import { CharacterCount } from "@/features/enterprise/components/EnterpriseModuleFormFields";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { StaffProjectManageSectionAlerts } from "../StaffProjectManageSectionAlerts";
import { PROJECT_NAME_MAX_LENGTH, useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

const fieldsetResetStyle: CSSProperties = { border: "none", margin: 0, padding: 0, minWidth: 0 };

export function StaffProjectManageProjectNameSection() {
  const {
    name,
    setName,
    savedName,
    nameTrimmed,
    nameError,
    detailsDisabled,
    isArchived,
    isSaving,
    scopeDisabled,
    detailsSuccess,
    detailsError,
    handleSubmitName,
  } = useStaffProjectManageSetup();

  return (
    <StaffProjectManageFormCollapsible title="Project details" defaultOpen={!detailsDisabled}>
      <form
        className="enterprise-modules__create-form enterprise-module-create__form enterprise-module-create__form--single-column"
        onSubmit={handleSubmitName}
        noValidate
      >
        <fieldset disabled={detailsDisabled} style={fieldsetResetStyle}>
          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
            <label htmlFor="project-name-input" className="enterprise-modules__create-field-label">
              Project name
            </label>
            <p className="ui-note ui-note--muted">
              {detailsDisabled
                ? isArchived
                  ? "Unarchive this project to rename it."
                  : "The parent module is archived; unarchive the module to edit this project."
                : "This name appears in the staff workspace and student-facing areas that reference the project."}
            </p>
            <StaffProjectManageSectionAlerts success={detailsSuccess} error={detailsError} />
            <FormField
              id="project-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              aria-label="Project name"
              aria-invalid={nameError ? true : undefined}
              disabled={detailsDisabled || isSaving}
            />
            {nameError ? <span className="enterprise-module-create__field-error">{nameError}</span> : null}
            <CharacterCount value={name} limit={PROJECT_NAME_MAX_LENGTH} />
            {!detailsDisabled ? (
              <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions" style={{ marginTop: 12 }}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={scopeDisabled || Boolean(nameError) || nameTrimmed === savedName.trim()}
                >
                  {isSaving ? "Saving…" : "Save project name"}
                </Button>
              </div>
            ) : null}
          </div>
        </fieldset>
      </form>
    </StaffProjectManageFormCollapsible>
  );
}
