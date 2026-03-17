"use client";

import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { EnterpriseModuleAccessSection } from "./EnterpriseModuleAccessSection";
import { CharacterCount, EnterpriseModuleEditFields } from "./EnterpriseModuleFormFields";
import { useEnterpriseModuleCreateFormState } from "./useEnterpriseModuleCreateFormState";

const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_SECTION_MAX_LENGTH = 8000;

type EnterpriseModuleCreateFormProps = {
  mode?: "create" | "edit";
  moduleId?: number;
  workspace?: "enterprise" | "staff";
};

export function EnterpriseModuleCreateForm({
  mode = "create",
  moduleId,
  workspace = "enterprise",
}: EnterpriseModuleCreateFormProps) {
  const {
    isEditMode,
    moduleName,
    moduleNameError,
    briefText,
    timelineText,
    expectationsText,
    readinessNotesText,
    leaderIds,
    taIds,
    studentIds,
    staffSearchQuery,
    taSearchQuery,
    studentSearchQuery,
    staffUsers,
    taUsers,
    studentUsers,
    staffStatus,
    taStatus,
    studentStatus,
    staffMessage,
    taMessage,
    studentMessage,
    staffPage,
    taPage,
    studentPage,
    staffPageInput,
    taPageInput,
    studentPageInput,
    staffTotalPages,
    taTotalPages,
    studentTotalPages,
    staffTotal,
    taTotal,
    studentTotal,
    staffStart,
    taStart,
    studentStart,
    staffEnd,
    taEnd,
    studentEnd,
    isLoadingAccess,
    canEditModule,
    errorMessage,
    isSubmitting,
    isDeleting,
    confirmDeleteModule,
    leaderSet,
    taSet,
    studentSet,
    setBriefText,
    setTimelineText,
    setExpectationsText,
    setReadinessNotesText,
    setStaffSearchQuery,
    setTaSearchQuery,
    setStudentSearchQuery,
    setStaffPage,
    setTaPage,
    setStudentPage,
    setStaffPageInput,
    setTaPageInput,
    setStudentPageInput,
    setConfirmDeleteModule,
    handleModuleNameChange,
    handleSubmit,
    handleDeleteModule,
    toggleLeader,
    toggleTeachingAssistant,
    toggleStudent,
    applyPageInput,
    handlePageJump,
    navigateHome,
  } = useEnterpriseModuleCreateFormState({ mode, moduleId, workspace });

  if (isLoadingAccess) {
    return <p className="muted">Loading module access options...</p>;
  }

  if (isEditMode && !canEditModule) {
    return (
      <div className="ui-stack-sm">
        <div className="status-alert status-alert--error enterprise-module-create__error">
          <span>{errorMessage ?? "Only module owners/leaders can edit this module."}</span>
        </div>
        <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
          <Button type="button" variant="ghost" onClick={navigateHome}>
            Back to modules
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="enterprise-modules__create-form enterprise-module-create__form" onSubmit={handleSubmit} noValidate>
      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
        <label htmlFor="module-name-input" className="enterprise-modules__create-field-label">
          Module name
        </label>
        <FormField
          id="module-name-input"
          value={moduleName}
          onChange={(event) => handleModuleNameChange(event.target.value)}
          placeholder="Module name"
          aria-label="Module name"
          aria-invalid={moduleNameError ? true : undefined}
        />
        {moduleNameError ? <span className="enterprise-module-create__field-error">{moduleNameError}</span> : null}
        <CharacterCount value={moduleName} limit={MODULE_NAME_MAX_LENGTH} />
      </div>

      {isEditMode ? (
        <EnterpriseModuleEditFields
          briefText={briefText}
          timelineText={timelineText}
          expectationsText={expectationsText}
          readinessNotesText={readinessNotesText}
          maxLength={MODULE_SECTION_MAX_LENGTH}
          onBriefTextChange={setBriefText}
          onTimelineTextChange={setTimelineText}
          onExpectationsTextChange={setExpectationsText}
          onReadinessNotesTextChange={setReadinessNotesText}
        />
      ) : (
        <p className="ui-note ui-note--muted">
          You can define module brief, timeline, expectations, teaching assistants, and student enrollment after creating the module.
        </p>
      )}

      <EnterpriseModuleAccessSection
        label="Module owners/leaders"
        helperText="Owners can edit this module and manage role assignments."
        groupLabel="Module leaders"
        searchId="module-staff-search"
        searchAriaLabel="Search staff"
        searchPlaceholder="Search staff by name, email, or ID"
        searchQuery={staffSearchQuery}
        onSearchChange={setStaffSearchQuery}
        status={staffStatus}
        total={staffTotal}
        start={staffStart}
        end={staffEnd}
        users={staffUsers}
        selectedSet={leaderSet}
        onToggle={toggleLeader}
        isCheckedDisabled={() => isSubmitting || isDeleting}
        message={staffMessage}
        page={staffPage}
        pageInput={staffPageInput}
        totalPages={staffTotalPages}
        pageInputId="module-staff-page-input"
        pageJumpAriaLabel="Go to staff page"
        onPageInputChange={setStaffPageInput}
        onPageInputBlur={() => applyPageInput("staff", staffPageInput)}
        onPageJump={(event) => handlePageJump(event, "staff", staffPageInput)}
        onPreviousPage={() => setStaffPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setStaffPage((prev) => Math.min(Math.max(1, staffTotalPages), prev + 1))}
        loadingLabel="Loading staff..."
        zeroLabel="Showing 0 accounts"
        noResultsLabel={(query) => `No staff match "${query}".`}
        emptyLabel="No staff accounts found."
        selectedCountLabel={`${leaderIds.length} selected`}
      />
      {!isEditMode && leaderIds.length === 0 ? (
        <span className="enterprise-module-create__field-error">Select at least one module leader to continue.</span>
      ) : null}

      {isEditMode ? (
        <>
          <EnterpriseModuleAccessSection
            label="Teaching assistants"
            helperText="TAs can be any account type and can access module workflows, but cannot manage role assignments."
            groupLabel="Teaching assistants"
            searchId="module-ta-search"
            searchAriaLabel="Search teaching assistant accounts"
            searchPlaceholder="Search accounts by name, email, or ID"
            searchQuery={taSearchQuery}
            onSearchChange={setTaSearchQuery}
            status={taStatus}
            total={taTotal}
            start={taStart}
            end={taEnd}
            users={taUsers}
            selectedSet={taSet}
            onToggle={toggleTeachingAssistant}
            isCheckedDisabled={(user) => isSubmitting || isDeleting || leaderSet.has(user.id)}
            message={taMessage}
            page={taPage}
            pageInput={taPageInput}
            totalPages={taTotalPages}
            pageInputId="module-ta-page-input"
            pageJumpAriaLabel="Go to teaching assistant page"
            onPageInputChange={setTaPageInput}
            onPageInputBlur={() => applyPageInput("ta", taPageInput)}
            onPageJump={(event) => handlePageJump(event, "ta", taPageInput)}
            onPreviousPage={() => setTaPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setTaPage((prev) => Math.min(Math.max(1, taTotalPages), prev + 1))}
            loadingLabel="Loading accounts..."
            zeroLabel="Showing 0 accounts"
            noResultsLabel={(query) => `No accounts match "${query}".`}
            emptyLabel="No assignable accounts found."
            selectedCountLabel={`${taIds.length} selected`}
          />

          <EnterpriseModuleAccessSection
            label="Students"
            helperText="Enrolled students can participate in module projects and assessments."
            groupLabel="Module students"
            searchId="module-student-search"
            searchAriaLabel="Search students"
            searchPlaceholder="Search students by name, email, or ID"
            searchQuery={studentSearchQuery}
            onSearchChange={setStudentSearchQuery}
            status={studentStatus}
            total={studentTotal}
            start={studentStart}
            end={studentEnd}
            users={studentUsers}
            selectedSet={studentSet}
            onToggle={toggleStudent}
            isCheckedDisabled={() => isSubmitting || isDeleting}
            message={studentMessage}
            page={studentPage}
            pageInput={studentPageInput}
            totalPages={studentTotalPages}
            pageInputId="module-student-page-input"
            pageJumpAriaLabel="Go to student page"
            onPageInputChange={setStudentPageInput}
            onPageInputBlur={() => applyPageInput("students", studentPageInput)}
            onPageJump={(event) => handlePageJump(event, "students", studentPageInput)}
            onPreviousPage={() => setStudentPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setStudentPage((prev) => Math.min(Math.max(1, studentTotalPages), prev + 1))}
            loadingLabel="Loading students..."
            zeroLabel="Showing 0 students"
            noResultsLabel={(query) => `No students match "${query}".`}
            emptyLabel="No students found."
            selectedCountLabel={`${studentIds.length} selected`}
          />
        </>
      ) : null}

      {isEditMode ? (
        <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
          <div className="enterprise-module-create__danger-zone">
            <h3 className="enterprise-module-create__danger-title">Delete module</h3>
            <p className="ui-note">
              This permanently deletes the module and its related projects, teams, and access assignments.
            </p>
            <label htmlFor="module-delete-confirmation" className="enterprise-module-create__danger-confirm">
              <input
                id="module-delete-confirmation"
                type="checkbox"
                checked={confirmDeleteModule}
                onChange={(event) => setConfirmDeleteModule(event.target.checked)}
                disabled={isSubmitting || isDeleting}
              />
              <span>I understand this action cannot be undone.</span>
            </label>
            <div className="ui-row ui-row--end">
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteModule}
                disabled={isSubmitting || isDeleting || !confirmDeleteModule}
              >
                {isDeleting ? "Deleting..." : "Delete module"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="status-alert status-alert--error enterprise-module-create__error">
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
        <Button type="button" variant="ghost" onClick={navigateHome} disabled={isSubmitting || isDeleting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isDeleting || (!isEditMode && leaderIds.length === 0)}>
          {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save module" : "Create module"}
        </Button>
      </div>
    </form>
  );
}
