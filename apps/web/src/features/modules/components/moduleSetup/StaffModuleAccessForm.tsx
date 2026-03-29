"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useEnterpriseModuleCreateFormState } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import { Button } from "@/shared/ui/Button";
import { StaffModuleAccessChangesReview } from "./StaffModuleAccessChangesReview";
import { StaffModuleAccessTwoColumnSection } from "./StaffModuleAccessTwoColumnSection";

export type StaffModuleAccessFormProps = {
  moduleId: number;
  currentUserId: number;
  initialAccessSelection: EnterpriseModuleAccessSelectionResponse;
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
 * Staff workspace: module leads edit leaders + TAs
 * review step before persisting; unsaved removals show a red row state in the lists.
 */
export function StaffModuleAccessForm({ moduleId, currentUserId, initialAccessSelection }: StaffModuleAccessFormProps) {
  const router = useRouter();
  const staffMembersHref = `/staff/modules/${moduleId}/staff`;
  const [step, setStep] = useState<Step>("edit");
  const [baseline] = useState(() => ({
    leaderIds: [...initialAccessSelection.leaderIds],
    taIds: [...initialAccessSelection.taIds],
  }));

  const state = useEnterpriseModuleCreateFormState({
    mode: "edit",
    moduleId,
    workspace: "staff",
    successRedirectAfterUpdateHref: staffMembersHref,
  });

  const baselineLeaderSet = useMemo(() => new Set(baseline.leaderIds), [baseline.leaderIds]);
  const baselineTaSet = useMemo(() => new Set(baseline.taIds), [baseline.taIds]);

  const userLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of state.staffUsers) {
      if (!m.has(u.id)) {
        const name = `${u.firstName} ${u.lastName}`.trim();
        m.set(u.id, name || u.email || `User ID ${u.id}`);
      }
    }
    for (const u of state.taUsers) {
      if (!m.has(u.id)) {
        const name = `${u.firstName} ${u.lastName}`.trim();
        m.set(u.id, name || u.email || `User ID ${u.id}`);
      }
    }
    return m;
  }, [state.staffUsers, state.taUsers]);

  const leaderDiff = useMemo(
    () => diffIds(baseline.leaderIds, state.leaderIds),
    [baseline.leaderIds, state.leaderIds],
  );
  const taDiff = useMemo(() => diffIds(baseline.taIds, state.taIds), [baseline.taIds, state.taIds]);

  const hasChanges = useMemo(() => {
    return (
      leaderDiff.added.length +
        leaderDiff.removed.length +
        taDiff.added.length +
        taDiff.removed.length >
      0
    );
  }, [leaderDiff, taDiff]);

  const labelFor = (id: number) => userLabelById.get(id) ?? `User ID ${id}`;

  if (state.isLoadingAccess) {
    return <p className="muted">Loading staff access…</p>;
  }

  if (!state.canEditModule) {
    return (
      <div className="status-alert status-alert--error enterprise-module-create__error">
        <span>{state.errorMessage ?? "Only module owners/leaders can edit staff access."}</span>
      </div>
    );
  }

  return (
    <div className="enterprise-modules__create-form enterprise-module-create__form enterprise-module-create__form--staff-access">
      {step === "edit" ? (
        <>
        
          <StaffModuleAccessTwoColumnSection
            state={state}
            baselineLeaderSet={baselineLeaderSet}
            baselineTaSet={baselineTaSet}
            currentUserId={currentUserId}
          />
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
            className="staff-module-access__review"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <h3 className="overview-title" style={{ fontSize: "1.05rem", marginBottom: 12 }}>
              Confirm staff access changes
            </h3>
            <p className="ui-note ui-note--muted" style={{ marginBottom: 16 }}>
              Summary of updates that will be saved to this module. No changes are applied until you confirm.
            </p>

            <StaffModuleAccessChangesReview
              hasChanges={hasChanges}
              leaderDiff={leaderDiff}
              taDiff={taDiff}
              labelFor={labelFor}
            />
          </div>

          {state.errorMessage ? (
            <div className="status-alert status-alert--error enterprise-module-create__error">
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
}
