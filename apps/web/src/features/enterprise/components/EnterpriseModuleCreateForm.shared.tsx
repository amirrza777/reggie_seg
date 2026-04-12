import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/features/auth/useUser";
import { ModuleJoinCodeBanner } from "@/features/modules/components/ModuleJoinCodeBanner";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { EnterpriseModuleAccessSection } from "./EnterpriseModuleAccessSection";
import { CharacterCount, EnterpriseModuleEditFields } from "./EnterpriseModuleFormFields";
import { useEnterpriseModuleCreateFormState } from "./useEnterpriseModuleCreateFormState";

const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_CODE_MAX_LENGTH = 32;
const MODULE_SECTION_MAX_LENGTH = 8000;

export type ModuleCreateFormState = ReturnType<typeof useEnterpriseModuleCreateFormState>;

export const fieldsetResetStyle: CSSProperties = { border: "none", margin: 0, padding: 0, minWidth: 0 };

export function ModuleFormCollapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);
  return (
    <details
      className="enterprise-module-create__collapsible"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="enterprise-module-create__collapsible-summary">
        <span className="enterprise-module-create__collapsible-summary-text">
          <span className="enterprise-module-create__collapsible-title">{title}</span>
        </span>
      </summary>
      <div className="enterprise-module-create__collapsible-body">{children}</div>
    </details>
  );
}

export function ModuleEditBlockedNotice({ state }: { state: ModuleCreateFormState }) {
  return (
    <div className="ui-stack-sm">
      <div className="status-alert status-alert--error enterprise-module-create__error">
        <span>{state.errorMessage ?? "Only module owners/leaders can edit this module."}</span>
      </div>
    </div>
  );
}

export function ModuleNameField({ state }: { state: ModuleCreateFormState }) {
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

export function ModuleCodeField({ state }: { state: ModuleCreateFormState }) {
  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
      <label htmlFor="module-code-input" className="enterprise-modules__create-field-label">
        Module code
      </label>
      <p className="ui-note ui-note--muted">
        Optional reference (e.g. timetable ID or acronym)
      </p>
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

export function ModuleJoinCodeField({ joinCode, created }: { joinCode: string | null; created: boolean }) {
  const code = joinCode?.trim() || null;

  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
      <span id="module-join-code-label" className="enterprise-modules__create-field-label">
        Module joining code
      </span>
      <p className="ui-note ui-note--muted">
        Students can self-enroll using the join code via{" "}
        <Link href="/dashboard" className="ui-link ">
          <strong>join a module</strong>
        </Link>{" "}
        on their dashboard.
      </p>
      {created ? (
        <div className="status-alert status-alert--success enterprise-module-create__created-banner">
          Module created. Students can now join with this code.
        </div>
      ) : null}
      {code ? <ModuleJoinCodeBanner joinCode={code} /> : <p className="muted">The join code could not be loaded.</p>}
    </div>
  );
}

export function ModuleEditFieldsSection({ state }: { state: ModuleCreateFormState }) {
  if (!state.isEditMode) {
    return (
      <div className="enterprise-module-create__edit-preface">
        <p className="ui-note ui-note--muted">
          Full module details, such as module brief, timelines, expectations, teaching assistants, and student access,
          can be defined once the module has been created. This can be done by you, or any module leader you add above.
        </p>
      </div>
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

export function ModuleLeaderAccessSection({
  state,
  currentUserId,
}: {
  state: ModuleCreateFormState;
  currentUserId: number | null;
}) {
  const scopeDisabled = state.isSubmitting || state.isDeleting || state.isArchiving;
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
        onPageJump={() => state.applyPageInput("staff", state.staffPageInput)}
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

export function ModuleEditModeAccessSections({ state }: { state: ModuleCreateFormState }) {
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
        isCheckedDisabled={(user) => state.isSubmitting || state.isDeleting || state.isArchiving}
        message={state.taMessage}
        page={state.taPage}
        pageInput={state.taPageInput}
        totalPages={state.taTotalPages}
        pageInputId="module-ta-page-input"
        pageJumpAriaLabel="Go to teaching assistant page"
        onPageInputChange={state.setTaPageInput}
        onPageInputBlur={() => state.applyPageInput("ta", state.taPageInput)}
        onPageJump={() => state.applyPageInput("ta", state.taPageInput)}
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
        isCheckedDisabled={() => state.isSubmitting || state.isDeleting || state.isArchiving}
        message={state.studentMessage}
        page={state.studentPage}
        pageInput={state.studentPageInput}
        totalPages={state.studentTotalPages}
        pageInputId="module-student-page-input"
        pageJumpAriaLabel="Go to student page"
        onPageInputChange={state.setStudentPageInput}
        onPageInputBlur={() => state.applyPageInput("students", state.studentPageInput)}
        onPageJump={() => state.applyPageInput("students", state.studentPageInput)}
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

export function useCurrentUserId() {
  const { user } = useUser();
  return user?.id ?? null;
}
