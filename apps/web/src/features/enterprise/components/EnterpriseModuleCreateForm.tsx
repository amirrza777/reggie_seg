"use client";

import { useCallback } from "react";
import { useUser } from "@/features/auth/useUser";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { EnterpriseModuleAccessSection } from "./EnterpriseModuleAccessSection";
import { CharacterCount, EnterpriseModuleEditFields } from "./EnterpriseModuleFormFields";
import { ModuleJoinCodeCard } from "./ModuleJoinCodeCard";
import { useEnterpriseModuleCreateFormState } from "./useEnterpriseModuleCreateFormState";
import { MeetingSettingsSection } from "./MeetingSettingsSection";

const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_CODE_MAX_LENGTH = 32;
const MODULE_SECTION_MAX_LENGTH = 8000;

type EnterpriseModuleCreateFormProps = {
  mode?: "create" | "edit";
  moduleId?: number;
  workspace?: "enterprise" | "staff";
  createdJoinCode?: string | null;
};

type ModuleCreateFormState = ReturnType<typeof useEnterpriseModuleCreateFormState>;

export function EnterpriseModuleCreateForm({
  mode = "create",
  moduleId,
  workspace = "enterprise",
  createdJoinCode = null,
}: EnterpriseModuleCreateFormProps) {
  const state = useEnterpriseModuleCreateFormState({ mode, moduleId, workspace });

  if (state.isLoadingAccess) {
    return <p className="muted">Loading module access options...</p>;
  }

  if (state.isEditMode && !state.canEditModule) {
    return <ModuleEditBlockedNotice state={state} />;
  }

  return (
    <EnterpriseModuleCreateFormBody state={state} moduleId={moduleId} createdJoinCode={createdJoinCode} />
  );
}

function EnterpriseModuleCreateFormBody({
  state,
  moduleId,
  createdJoinCode,
}: {
  state: ModuleCreateFormState;
  moduleId?: number;
  createdJoinCode?: string | null;
}) {
  const { user } = useUser();
  const currentUserId = user?.id ?? null;

  return (
    <form className="enterprise-modules__create-form enterprise-module-create__form" onSubmit={state.handleSubmit} noValidate>
      <ModuleNameField state={state} />
      <ModuleCodeField state={state} />
      {state.isEditMode && moduleId ? (
        <ModuleJoinCodeCard
          moduleId={moduleId}
          initialJoinCode={createdJoinCode}
          showCreatedBanner={Boolean(createdJoinCode)}
        />
      ) : null}
      <ModuleEditFieldsSection state={state} />
      <ModuleLeaderAccessSection state={state} currentUserId={currentUserId} />
      {state.isEditMode ? <ModuleEditModeAccessSections state={state} /> : null}
      {state.isEditMode && moduleId ? (
        <div className="enterprise-module-create__field enterprise-module-create__field--meeting-settings">
          <MeetingSettingsSection moduleId={moduleId} />
        </div>
      ) : null}
      {state.isEditMode ? <ModuleDeleteSection state={state} /> : null}
      <ModuleErrorMessage errorMessage={state.errorMessage} />
      <ModuleFormActions state={state} />
    </form>
  );
}

function ModuleEditBlockedNotice({ state }: { state: ModuleCreateFormState }) {
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

function ModuleNameField({ state }: { state: ModuleCreateFormState }) {
  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
      <label htmlFor="module-name-input" className="enterprise-modules__create-field-label">
        Module name
      </label>
      <FormField
        id="module-name-input"
        value={state.moduleName}
        onChange={(event) => state.handleModuleNameChange(event.target.value)}
        placeholder="Module name"
        aria-label="Module name"
        aria-invalid={state.moduleNameError ? true : undefined}
      />
      {state.moduleNameError ? <span className="enterprise-module-create__field-error">{state.moduleNameError}</span> : null}
      <CharacterCount value={state.moduleName} limit={MODULE_NAME_MAX_LENGTH} />
    </div>
  );
}

function ModuleCodeField({ state }: { state: ModuleCreateFormState }) {
  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
      <label htmlFor="module-code-input" className="enterprise-modules__create-field-label">
        Module code
      </label>
      <FormField
        id="module-code-input"
        value={state.moduleCode}
        onChange={(event) => state.setModuleCode(event.target.value.toUpperCase())}
        placeholder="Enter code"
        aria-label="Module code"
      />
      <CharacterCount value={state.moduleCode} limit={MODULE_CODE_MAX_LENGTH} />
    </div>
  );
}

function ModuleEditFieldsSection({ state }: { state: ModuleCreateFormState }) {
  if (!state.isEditMode) {
    return (
      <p className="ui-note ui-note--muted">
        You can define module brief, timeline, expectations, teaching assistants, manual student assignments, and share
        the join code after creating the module. You can also set the university-facing module code here.
      </p>
    );
  }

  return (
    <EnterpriseModuleEditFields
      briefText={state.briefText}
      timelineText={state.timelineText}
      expectationsText={state.expectationsText}
      readinessNotesText={state.readinessNotesText}
      maxLength={MODULE_SECTION_MAX_LENGTH}
      onBriefTextChange={state.setBriefText}
      onTimelineTextChange={state.setTimelineText}
      onExpectationsTextChange={state.setExpectationsText}
      onReadinessNotesTextChange={state.setReadinessNotesText}
    />
  );
}

function ModuleLeaderAccessSection({
  state,
  currentUserId,
}: {
  state: ModuleCreateFormState;
  currentUserId: number | null;
}) {
  const scopeDisabled = state.isSubmitting || state.isDeleting;
  const onToggleLeader = useCallback(
    (userId: number, checked: boolean) => {
      if (currentUserId != null && userId === currentUserId && !checked) return;
      state.toggleLeader(userId, checked);
    },
    [currentUserId, state.toggleLeader],
  );

  return (
    <>
      <EnterpriseModuleAccessSection
        label="Module owners/leaders"
        helperText="Owners can edit this module and manage role assignments."
        groupLabel="Module leaders"
        searchId="module-staff-search"
        searchAriaLabel="Search staff"
        searchPlaceholder="Search staff by name, email, or ID"
        searchQuery={state.staffSearchQuery}
        onSearchChange={state.setStaffSearchQuery}
        status={state.staffStatus}
        total={state.staffTotal}
        start={state.staffStart}
        end={state.staffEnd}
        users={state.staffUsers}
        selectedSet={state.leaderSet}
        onToggle={onToggleLeader}
        isCheckedDisabled={(user) =>
          scopeDisabled ||
          (currentUserId != null && user.id === currentUserId && state.leaderSet.has(user.id))
        }
        message={state.staffMessage}
        page={state.staffPage}
        pageInput={state.staffPageInput}
        totalPages={state.staffTotalPages}
        pageInputId="module-staff-page-input"
        pageJumpAriaLabel="Go to staff page"
        onPageInputChange={state.setStaffPageInput}
        onPageInputBlur={() => state.applyPageInput("staff", state.staffPageInput)}
        onPageJump={() => state.handlePageJump("staff", state.staffPageInput)}
        onPreviousPage={() => state.setStaffPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => state.setStaffPage((prev) => Math.min(Math.max(1, state.staffTotalPages), prev + 1))}
        loadingLabel="Loading staff..."
        zeroLabel="Showing 0 accounts"
        noResultsLabel={(query) => `No staff match "${query}".`}
        emptyLabel="No staff accounts found."
        selectedCountLabel={`${state.leaderIds.length} selected`}
      />
      {!state.isEditMode && state.leaderIds.length === 0 ? (
        <span className="enterprise-module-create__field-error">Select at least one module leader to continue.</span>
      ) : null}
    </>
  );
}

function ModuleEditModeAccessSections({ state }: { state: ModuleCreateFormState }) {
  return (
    <>
      <EnterpriseModuleAccessSection
        label="Teaching assistants"
        helperText="TAs can be any account type and can access module workflows, but cannot manage role assignments."
        groupLabel="Teaching assistants"
        searchId="module-ta-search"
        searchAriaLabel="Search teaching assistant accounts"
        searchPlaceholder="Search accounts by name, email, or ID"
        searchQuery={state.taSearchQuery}
        onSearchChange={state.setTaSearchQuery}
        status={state.taStatus}
        total={state.taTotal}
        start={state.taStart}
        end={state.taEnd}
        users={state.taUsers}
        selectedSet={state.taSet}
        onToggle={state.toggleTeachingAssistant}
        isCheckedDisabled={(user) => state.isSubmitting || state.isDeleting}
        message={state.taMessage}
        page={state.taPage}
        pageInput={state.taPageInput}
        totalPages={state.taTotalPages}
        pageInputId="module-ta-page-input"
        pageJumpAriaLabel="Go to teaching assistant page"
        onPageInputChange={state.setTaPageInput}
        onPageInputBlur={() => state.applyPageInput("ta", state.taPageInput)}
        onPageJump={() => state.handlePageJump("ta", state.taPageInput)}
        onPreviousPage={() => state.setTaPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => state.setTaPage((prev) => Math.min(Math.max(1, state.taTotalPages), prev + 1))}
        loadingLabel="Loading accounts..."
        zeroLabel="Showing 0 accounts"
        noResultsLabel={(query) => `No accounts match "${query}".`}
        emptyLabel="No assignable accounts found."
        selectedCountLabel={`${state.taIds.length} selected`}
      />

      <EnterpriseModuleAccessSection
        label="Students"
        helperText="Students can be assigned manually here and can also self-join with the module code."
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
        onPageJump={() => state.handlePageJump("students", state.studentPageInput)}
        onPreviousPage={() => state.setStudentPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => state.setStudentPage((prev) => Math.min(Math.max(1, state.studentTotalPages), prev + 1))}
        loadingLabel="Loading students..."
        zeroLabel="Showing 0 students"
        noResultsLabel={(query) => `No students match "${query}".`}
        emptyLabel="No students found."
        selectedCountLabel={`${state.studentIds.length} selected`}
      />
    </>
  );
}

function ModuleDeleteSection({ state }: { state: ModuleCreateFormState }) {
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

function ModuleFormActions({ state }: { state: ModuleCreateFormState }) {
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
