"use client";

import { useCallback } from "react";
import type { ModuleSetupFormState } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";
import { ModuleAccessSearchSection } from "../ModuleAccessSearchSection";

export type ModuleStaffAccessSectionProps = {
  state: ModuleSetupFormState;
  /** When set, the editor cannot uncheck their own module lead row. */
  currentUserId?: number | null;
};

export function ModuleStaffAccessSection({ state, currentUserId = null }: ModuleStaffAccessSectionProps) {
  const interactionDisabled = state.isSubmitting || state.isDeleting;
  const hideOnModuleToggleDisabled = interactionDisabled || state.moduleId == null;

  const onToggleLeader = useCallback(
    (userId: number, checked: boolean) => {
      if (currentUserId != null && userId === currentUserId && !checked) return;
      state.toggleLeader(userId, checked);
    },
    [currentUserId, state.toggleLeader],
  );

  return (
    <section className="module-setup-section module-setup-section--staff" aria-labelledby="module-setup-staff-title">
      <h3
        id="module-setup-staff-title"
        className="overview-title"
        style={{ fontSize: "var(--fs-fixed-1-1rem)", marginBottom: 8 }}
      >
        Staff access
      </h3>
      <p className="ui-note ui-note--muted" style={{ marginBottom: 16 }}>
        Module leads can edit setup and roles. Teaching assistants can use module workflows without managing assignments.
      </p>

      <ModuleAccessSearchSection
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
          interactionDisabled ||
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
        onCommitPageJump={() => state.applyPageInput("staff", state.staffPageInput)}
        onPreviousPage={() => state.setStaffPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => state.setStaffPage((prev) => Math.min(Math.max(1, state.staffTotalPages), prev + 1))}
        loadingLabel="Loading staff..."
        zeroLabel="Showing 0 accounts"
        noResultsLabel={(query) => `No staff match "${query}".`}
        emptyLabel="No staff accounts found."
        selectedCountLabel={`${state.leaderIds.length} selected`}
        onlyWithoutModuleAccess={state.staffSearchOnlyWithoutModuleAccess}
        onToggleOnlyWithoutModuleAccess={() =>
          state.setStaffSearchOnlyWithoutModuleAccess((prev) => !prev)
        }
        onlyWithoutModuleAccessDisabled={hideOnModuleToggleDisabled}
      />
      {!state.isEditMode && state.leaderIds.length === 0 ? (
        <span className="enterprise-module-create__field-error">Select at least one module leader to continue.</span>
      ) : null}

      {state.isEditMode ? (
        <ModuleAccessSearchSection
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
          isCheckedDisabled={(user) => interactionDisabled}
          message={state.taMessage}
          page={state.taPage}
          pageInput={state.taPageInput}
          totalPages={state.taTotalPages}
          pageInputId="module-ta-page-input"
          pageJumpAriaLabel="Go to teaching assistant page"
          onPageInputChange={state.setTaPageInput}
          onPageInputBlur={() => state.applyPageInput("ta", state.taPageInput)}
          onCommitPageJump={() => state.applyPageInput("ta", state.taPageInput)}
          onPreviousPage={() => state.setTaPage((prev) => Math.max(1, prev - 1))}
          onNextPage={() => state.setTaPage((prev) => Math.min(Math.max(1, state.taTotalPages), prev + 1))}
          loadingLabel="Loading accounts..."
          zeroLabel="Showing 0 accounts"
          noResultsLabel={(query) => `No accounts match "${query}".`}
          emptyLabel="No assignable accounts found."
          selectedCountLabel={`${state.taIds.length} selected`}
          onlyWithoutModuleAccess={state.taSearchOnlyWithoutModuleAccess}
          onToggleOnlyWithoutModuleAccess={() =>
            state.setTaSearchOnlyWithoutModuleAccess((prev) => !prev)
          }
          onlyWithoutModuleAccessDisabled={hideOnModuleToggleDisabled}
        />
      ) : null}
    </section>
  );
}
