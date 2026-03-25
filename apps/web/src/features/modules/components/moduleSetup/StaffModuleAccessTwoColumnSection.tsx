"use client";

import type { ModuleSetupFormState } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";
import { ModuleAccessSearchSection } from "../ModuleAccessSearchSection";

export type StaffModuleAccessTwoColumnSectionProps = {
  state: ModuleSetupFormState;
  baselineLeaderSet: Set<number>;
  baselineTaSet: Set<number>;
};


export function StaffModuleAccessTwoColumnSection({
  state,
  baselineLeaderSet,
  baselineTaSet,
}: StaffModuleAccessTwoColumnSectionProps) {
  const scopeDisabled = state.isSubmitting || state.isDeleting || state.moduleId == null;

  return (
    <section className="module-setup-section module-setup-section--staff" aria-labelledby="module-setup-staff-title">
      <div className="staff-module-access__columns">
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
          onToggle={state.toggleLeader}
          isCheckedDisabled={() => state.isSubmitting || state.isDeleting}
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
          baselineSelectedSet={baselineLeaderSet}
          sortSelectedFirst
          onlyWithoutModuleAccess={state.staffSearchOnlyWithoutModuleAccess}
          onToggleOnlyWithoutModuleAccess={() =>
            state.setStaffSearchOnlyWithoutModuleAccess((prev) => !prev)
          }
          onlyWithoutModuleAccessDisabled={scopeDisabled}
        />

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
          isCheckedDisabled={(user) => state.isSubmitting || state.isDeleting || state.leaderSet.has(user.id)}
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
          baselineSelectedSet={baselineTaSet}
          sortSelectedFirst
          onlyWithoutModuleAccess={state.taSearchOnlyWithoutModuleAccess}
          onToggleOnlyWithoutModuleAccess={() =>
            state.setTaSearchOnlyWithoutModuleAccess((prev) => !prev)
          }
          onlyWithoutModuleAccessDisabled={scopeDisabled}
        />
      </div>
    </section>
  );
}
