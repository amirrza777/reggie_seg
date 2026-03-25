"use client";

import { useMemo } from "react";
import { ModuleAccessSearchSection } from "@/features/modules/components/ModuleAccessSearchSection";
import { ModuleGuidanceSection, ModuleStaffAccessSection } from "@/features/modules/components/moduleSetup";
import {
  guidanceDefaultsFromAccessSelection,
  mergeGuidanceDefaultsWithStaffRow,
  moduleGuidanceApplyToken,
  type StaffModuleGuidanceRow,
} from "@/features/modules/components/moduleSetup/moduleGuidanceDefaults";
import { Button } from "@/shared/ui/Button";
import type { EnterpriseModuleAccessSelectionResponse } from "../types";
import { useEnterpriseModuleCreateFormState, type ModuleSetupFormState } from "./useEnterpriseModuleCreateFormState";

type EnterpriseModuleCreateFormProps = {
  mode?: "create" | "edit";
  moduleId?: number;
  workspace?: "enterprise" | "staff";
  initialAccessSelection?: EnterpriseModuleAccessSelectionResponse | null;
  staffModuleRow?: StaffModuleGuidanceRow | null;
};

export function EnterpriseModuleCreateForm({
  mode = "create",
  moduleId,
  workspace = "enterprise",
  initialAccessSelection,
  staffModuleRow,
}: EnterpriseModuleCreateFormProps) {
  const state = useEnterpriseModuleCreateFormState({ mode, moduleId, workspace, initialAccessSelection });

  if (state.isLoadingAccess) {
    return <p className="muted">Loading module access options...</p>;
  }

  if (state.isEditMode && !state.canEditModule) {
    return <ModuleEditBlockedNotice state={state} />;
  }

  return (
    <EnterpriseModuleCreateFormBody
      state={state}
      workspace={workspace}
      initialAccessSelection={initialAccessSelection ?? null}
      staffModuleRow={staffModuleRow ?? null}
    />
  );
}

function EnterpriseModuleCreateFormBody({
  state,
  workspace,
  initialAccessSelection,
  staffModuleRow,
}: {
  state: ModuleSetupFormState;
  workspace: "enterprise" | "staff";
  initialAccessSelection: EnterpriseModuleAccessSelectionResponse | null;
  staffModuleRow: StaffModuleGuidanceRow | null;
}) {
  const defaultGuidance = useMemo(() => {
    if (!state.isEditMode || !initialAccessSelection) return null;
    let g = guidanceDefaultsFromAccessSelection(initialAccessSelection);
    if (workspace === "staff" && staffModuleRow) {
      g = mergeGuidanceDefaultsWithStaffRow(g, staffModuleRow);
    }
    return g;
  }, [state.isEditMode, initialAccessSelection, workspace, staffModuleRow]);

  const guidanceFieldsKey = useMemo(
    () => (initialAccessSelection ? moduleGuidanceApplyToken(initialAccessSelection) : null),
    [initialAccessSelection],
  );

  return (
    <form className="enterprise-modules__create-form enterprise-module-create__form" onSubmit={state.handleSubmit} noValidate>
      <ModuleGuidanceSection
        state={state}
        defaultGuidance={defaultGuidance}
        guidanceFieldsKey={guidanceFieldsKey}
      />
      <ModuleStaffAccessSection state={state} />
      {state.isEditMode ? (
        <section id="module-student-access" className="module-setup-section module-setup-section--students">
          <ModuleAccessSearchSection
            label="Students"
            helperText="Enrolled students can participate in module projects and be added to teams. Search to find accounts, then check or uncheck to assign access."
            groupLabel="Module students"
            searchId="module-student-search"
            searchAriaLabel="Search students"
            searchPlaceholder="Search students by name, email, or ID"
            searchQuery={state.studentSearchQuery}
            onSearchChange={state.setStudentSearchQuery}
            status={state.studentStatus}
            total={state.studentTotal}
            start={state.studentStart}
            end={state.studentEnd}
            users={state.studentUsers}
            selectedSet={state.studentSet}
            onToggle={state.toggleStudent}
            isCheckedDisabled={() => state.isSubmitting || state.isDeleting}
            message={state.studentMessage}
            page={state.studentPage}
            pageInput={state.studentPageInput}
            totalPages={state.studentTotalPages}
            pageInputId="module-student-page-input"
            pageJumpAriaLabel="Go to student page"
            onPageInputChange={state.setStudentPageInput}
            onPageInputBlur={() => state.applyPageInput("students", state.studentPageInput)}
            onCommitPageJump={() => state.applyPageInput("students", state.studentPageInput)}
            onPreviousPage={() => state.setStudentPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => state.setStudentPage((prev) => Math.min(Math.max(1, state.studentTotalPages), prev + 1))}
            loadingLabel="Loading students..."
            zeroLabel="Showing 0 students"
            noResultsLabel={(query) => `No students match "${query}".`}
            emptyLabel="No students found."
            selectedCountLabel={`${state.studentIds.length} selected`}
            onlyWithoutModuleAccess={state.studentSearchOnlyWithoutModuleAccess}
            onToggleOnlyWithoutModuleAccess={() =>
              state.setStudentSearchOnlyWithoutModuleAccess((prev) => !prev)
            }
            onlyWithoutModuleAccessDisabled={
              state.isSubmitting || state.isDeleting || state.moduleId == null
            }
          />
        </section>
      ) : null}
      {state.isEditMode ? <ModuleDeleteSection state={state} /> : null}
      <ModuleErrorMessage errorMessage={state.errorMessage} />
      <ModuleFormActions state={state} />
    </form>
  );
}

function ModuleEditBlockedNotice({ state }: { state: ModuleSetupFormState }) {
  return (
    <div className="ui-stack-sm">
      <div className="status-alert status-alert--error enterprise-module-create__error">
        <span>{state.errorMessage ?? "Only module owners/leaders can edit this module."}</span>
      </div>
      <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
        <Button type="button" variant="ghost" onClick={state.navigateHome}>
          Back to modules
        </Button>
      </div>
    </div>
  );
}

function ModuleDeleteSection({ state }: { state: ModuleSetupFormState }) {
  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
      <div className="enterprise-module-create__danger-zone">
        <h3 className="enterprise-module-create__danger-title">Delete module</h3>
        <p className="ui-note">This permanently deletes the module and its related projects, teams, and access assignments.</p>
        <label htmlFor="module-delete-confirmation" className="enterprise-module-create__danger-confirm">
          <input
            id="module-delete-confirmation"
            type="checkbox"
            checked={state.confirmDeleteModule}
            onChange={(event) => state.setConfirmDeleteModule(event.target.checked)}
            disabled={state.isSubmitting || state.isDeleting}
          />
          <span>I understand this action cannot be undone.</span>
        </label>
        <div className="ui-row ui-row--end">
          <Button
            type="button"
            variant="danger"
            onClick={state.handleDeleteModule}
            disabled={state.isSubmitting || state.isDeleting || !state.confirmDeleteModule}
          >
            {state.isDeleting ? "Deleting..." : "Delete module"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModuleErrorMessage({ errorMessage }: { errorMessage: string | null }) {
  if (!errorMessage) return null;
  return (
    <div className="status-alert status-alert--error enterprise-module-create__error">
      <span>{errorMessage}</span>
    </div>
  );
}

function ModuleFormActions({ state }: { state: ModuleSetupFormState }) {
  return (
    <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
      <Button type="button" variant="ghost" onClick={state.navigateHome} disabled={state.isSubmitting || state.isDeleting}>
        Cancel
      </Button>
      <Button type="submit" disabled={state.isSubmitting || state.isDeleting || (!state.isEditMode && state.leaderIds.length === 0)}>
        {state.isSubmitting ? (state.isEditMode ? "Saving..." : "Creating...") : state.isEditMode ? "Save module" : "Create module"}
      </Button>
    </div>
  );
}
