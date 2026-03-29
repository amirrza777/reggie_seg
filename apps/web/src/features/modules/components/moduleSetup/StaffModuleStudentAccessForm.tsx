"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useEnterpriseModuleCreateFormState } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ModuleAccessSearchSection } from "../ModuleAccessSearchSection";

export type StaffModuleStudentAccessFormProps = {
  moduleId: number;
  /** Raw `[moduleId]` route param (for links). Required when `variant` is `"page"`. */
  moduleRouteParam?: string;
  initialAccessSelection: EnterpriseModuleAccessSelectionResponse;
  /** `"page"` includes back link, title, description, and Card (staff students/access route). */
  variant?: "embedded" | "page";
};

type Step = "edit" | "review";

function diffIds(baseline: number[], current: number[]) {
  const b = new Set(baseline);
  const c = new Set(current);
  const added = current.filter((id) => !b.has(id));
  const removed = baseline.filter((id) => !c.has(id));
  return { added, removed };
}

/**
 * Staff workspace: module leads edit enrolled students only (same module update API as enterprise; other roles unchanged).
 * Review step before save; removing an initially enrolled student highlights the row until confirmed.
 */
export function StaffModuleStudentAccessForm({
  moduleId,
  moduleRouteParam,
  initialAccessSelection,
  variant = "embedded",
}: StaffModuleStudentAccessFormProps) {
  const router = useRouter();
  const staffMembersHref = `/staff/modules/${moduleId}/students`;
  const [step, setStep] = useState<Step>("edit");
  const [baseline] = useState(() => ({
    studentIds: [...initialAccessSelection.studentIds],
  }));

  const state = useEnterpriseModuleCreateFormState({
    mode: "edit",
    moduleId,
    workspace: "staff",
    successRedirectAfterUpdateHref: `/staff/modules/${moduleId}/students`,
  });

  const baselineStudentSet = useMemo(() => new Set(baseline.studentIds), [baseline.studentIds]);

  const userLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of state.studentUsers) {
      if (!m.has(u.id)) {
        const name = `${u.firstName} ${u.lastName}`.trim();
        m.set(u.id, name || u.email || `User ID ${u.id}`);
      }
    }
    return m;
  }, [state.studentUsers]);

  const studentDiff = useMemo(
    () => diffIds(baseline.studentIds, state.studentIds),
    [baseline.studentIds, state.studentIds],
  );

  const hasChanges = useMemo(() => {
    return studentDiff.added.length + studentDiff.removed.length > 0;
  }, [studentDiff]);

  const labelFor = (id: number) => userLabelById.get(id) ?? `User ID ${id}`;

  const modSlug = moduleRouteParam ?? String(moduleId);

  if (state.isLoadingAccess) {
    const loading = <p className="muted">Loading student enrollment…</p>;
    return variant === "page" ? (
      <div className="ui-page enterprise-module-create-page">
        <Link href={`/staff/modules/${encodeURIComponent(modSlug)}/students`} className="muted">
          ← Back to current students
        </Link>
        <header className="ui-page__header">
          <h2 className="overview-title ui-page__title">Student enrollment</h2>
        </header>
        <Card>{loading}</Card>
      </div>
    ) : (
      loading
    );
  }

  if (!state.canEditModule) {
    const blocked = (
      <div className="status-alert status-alert--error enterprise-module-create__error">
        <span>{state.errorMessage ?? "Only module owners/leaders can edit student enrollment."}</span>
      </div>
    );
    return variant === "page" ? (
      <div className="ui-page enterprise-module-create-page">
        <Link href={`/staff/modules/${encodeURIComponent(modSlug)}/students`} className="muted">
          ← Back to current students
        </Link>
        <header className="ui-page__header">
          <h2 className="overview-title ui-page__title">Student enrollment</h2>
        </header>
        <Card>{blocked}</Card>
      </div>
    ) : (
      blocked
    );
  }

  const formInner = (
    <div className="enterprise-modules__create-form enterprise-module-create__form enterprise-module-create__form--staff-student-access">
      {step === "edit" ? (
        <>
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
              baselineSelectedSet={baselineStudentSet}
              onlyWithoutModuleAccess={state.studentSearchOnlyWithoutModuleAccess}
              onToggleOnlyWithoutModuleAccess={() =>
                state.setStudentSearchOnlyWithoutModuleAccess((prev) => !prev)
              }
              onlyWithoutModuleAccessDisabled={state.isSubmitting || state.isDeleting}
            />
          </section>
          {state.errorMessage ? (
            <div className="status-alert status-alert--error enterprise-module-create__error" style={{ marginTop: 16 }}>
              <span>{state.errorMessage}</span>
            </div>
          ) : null}
          <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions" style={{ marginTop: 16 }}>
          <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(staffMembersHref)}
              disabled={state.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" disabled={state.isSubmitting || !hasChanges} onClick={() => setStep("review")}>
              Review changes
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            className="staff-module-student-access__review"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <h3 className="overview-title" style={{ fontSize: "1.05rem", marginBottom: 12 }}>
              Confirm student enrollment changes
            </h3>
            <p className="ui-note ui-note--muted" style={{ marginBottom: 16 }}>
              Summary of updates that will be saved to this module. No changes are applied until you confirm.
            </p>

            {!hasChanges ? (
              <p className="muted">No changes to save.</p>
            ) : (
              <ul className="ui-stack-md" style={{ listStyle: "disc", paddingLeft: 20, margin: 0 }}>
                {studentDiff.added.length ? (
                  <li>
                    <strong>Enroll — add ({studentDiff.added.length})</strong>
                    <ul style={{ listStyle: "circle", marginTop: 8, paddingLeft: 18 }}>
                      {studentDiff.added.map((id) => (
                        <li key={`add-stu-${id}`}>{labelFor(id)}</li>
                      ))}
                    </ul>
                  </li>
                ) : null}
                {studentDiff.removed.length ? (
                  <li>
                    <strong>Enroll — remove ({studentDiff.removed.length})</strong>
                    <ul style={{ listStyle: "circle", marginTop: 8, paddingLeft: 18 }}>
                      {studentDiff.removed.map((id) => (
                        <li key={`rm-stu-${id}`}>{labelFor(id)}</li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          {state.errorMessage ? (
            <div className="status-alert status-alert--error enterprise-module-create__error" style={{ marginTop: 16 }}>
              <span>{state.errorMessage}</span>
            </div>
          ) : null}

          <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions" style={{ marginTop: 16 }}>
            <Button type="button" variant="ghost" onClick={() => setStep("edit")} disabled={state.isSubmitting}>
              Back to editing
            </Button>
            <Button type="button" disabled={state.isSubmitting || !hasChanges} onClick={() => void state.performSubmit()}>
              {state.isSubmitting ? "Saving…" : "Confirm and save"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (variant === "page") {
    return (
      <div className="ui-page enterprise-module-create-page">
        <Link href={`/staff/modules/${encodeURIComponent(modSlug)}/students`} className="muted">
          ← Back to current students
        </Link>
        <header className="ui-page__header">
          <h2 className="overview-title ui-page__title">Student enrollment</h2>
          <p className="ui-page__description">
            Choose which students are enrolled in this module. All students eligible for enrollment in this module are shown. Review before
            saving.
          </p>
        </header>
        <Card>{formInner}</Card>
      </div>
    );
  }

  return formInner;
}
