"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { includeId } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState.helpers";
import { ModuleAccessSearchSection } from "@/features/modules/components/ModuleAccessSearchSection";
import { patchStaffProjectManage } from "@/features/projects/api/client";
import type { StaffProjectManageAccessPerson } from "@/features/projects/types";
import {
  useStaffProjectStaticAccessBuckets,
  type StaffProjectStudentAccessListOptions,
} from "@/features/staff/projects/hooks/useStaffProjectStaticAccessBuckets";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

function displayName(p: StaffProjectManageAccessPerson) {
  return `${p.firstName} ${p.lastName}`.trim() || p.email || `User ${p.id}`;
}

function sortedIds(ids: number[]) {
  return [...ids].sort((a, b) => a - b);
}

function ModuleStaffSummaryBlock({
  title,
  people,
}: {
  title: string;
  people: StaffProjectManageAccessPerson[];
}) {
  return (
    <section className="stack" style={{ gap: 6 }}>
      <h4 className="overview-title" style={{ fontSize: "var(--fs-fixed-1rem)", margin: 0 }}>
        {title}
        {people.length > 0 ? ` (${people.length})` : ""}
      </h4>
      {people.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>None assigned on this module.</p>
      ) : (
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.45 }}>
          {people.map((p) => (
            <li key={p.id}>
              {displayName(p)} — {p.email}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StaffProjectManageProjectAccessSection() {
  const router = useRouter();
  const { projectId, initial, detailsDisabled } = useStaffProjectManageSetup();
  const { projectAccess, moduleId } = initial;
  const moduleStaffAccessHref = `/staff/modules/${encodeURIComponent(String(moduleId))}/manage`;
  const moduleStudentsHref = `/staff/modules/${encodeURIComponent(String(moduleId))}/students/access`;

  const baselineIds = useMemo(
    () => sortedIds(projectAccess.projectStudentIds),
    [projectAccess.projectStudentIds],
  );

  const [studentIds, setStudentIds] = useState<number[]>(() => [...projectAccess.projectStudentIds]);
  const [hideStudentsAlreadyOnProject, setHideStudentsAlreadyOnProject] = useState(false);
  const [phase, setPhase] = useState<"edit" | "confirm">("edit");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    setStudentIds([...projectAccess.projectStudentIds]);
    setPhase("edit");
    setSaveError(null);
    setSaveOk(null);
  }, [projectAccess.projectStudentIds]);

  const studentSet = useMemo(() => new Set(studentIds), [studentIds]);
  const baselineStudentSet = useMemo(() => new Set(baselineIds), [baselineIds]);

  const studentAccessListOptions = useMemo<StaffProjectStudentAccessListOptions>(
    () => ({
      prioritiseUserIds: baselineIds,
      hideAlreadySelectedForProject: hideStudentsAlreadyOnProject,
      selectedProjectStudentIds: studentSet,
    }),
    [baselineIds, hideStudentsAlreadyOnProject, studentSet],
  );

  const buckets = useStaffProjectStaticAccessBuckets(projectAccess.moduleMemberDirectory, studentAccessListOptions);

  const studentDiff = useMemo(() => {
    const next = new Set(studentIds);
    const base = new Set(baselineIds);
    const added: number[] = [];
    const removed: number[] = [];
    for (const id of next) {
      if (!base.has(id)) added.push(id);
    }
    for (const id of base) {
      if (!next.has(id)) removed.push(id);
    }
    added.sort((a, b) => a - b);
    removed.sort((a, b) => a - b);
    return { added, removed, hasChanges: added.length > 0 || removed.length > 0 };
  }, [baselineIds, studentIds]);

  const idToLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of [
      ...projectAccess.moduleLeaders,
      ...projectAccess.moduleTeachingAssistants,
      ...projectAccess.moduleMemberDirectory,
    ]) {
      m.set(p.id, displayName(p));
    }
    return m;
  }, [projectAccess.moduleLeaders, projectAccess.moduleTeachingAssistants, projectAccess.moduleMemberDirectory]);

  const toggleStudent = useCallback(
    (userId: number, checked: boolean) => {
      if (detailsDisabled) return;
      setStudentIds((prev) => (checked ? includeId(prev, userId) : prev.filter((id) => id !== userId)));
    },
    [detailsDisabled],
  );

  const onReview = useCallback(() => {
    setSaveError(null);
    setSaveOk(null);
    setPhase("confirm");
  }, []);

  const onConfirmSave = useCallback(async () => {
    if (detailsDisabled || !studentDiff.hasChanges) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      await patchStaffProjectManage(projectId, { projectStudentIds: sortedIds(studentIds) });
      setSaveOk("Project access saved.");
      setPhase("edit");
      router.refresh();
    } catch (e: unknown) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save project access.");
    } finally {
      setSaving(false);
    }
  }, [detailsDisabled, projectId, router, studentDiff.hasChanges, studentIds]);

  const scopeBusy = detailsDisabled || saving;

  return (
    <StaffProjectManageFormCollapsible title="Staff, TA, and student access" defaultOpen={false}>
      <p className="ui-note ui-note--muted">
        Module leads and teaching assistants are set on the parent module. Only student access is managed per-project (students from the module who are not leads or TAs).
      </p>

      {saveOk ? <p className="staff-projects__success">{saveOk}</p> : null}
      {saveError ? <p className="staff-projects__error">{saveError}</p> : null}

      {phase === "confirm" ? (
        <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--access" style={{ marginTop: 16 }}>
          <h3 className="enterprise-module-create__danger-title" style={{ marginTop: 0 }}>
            Review changes
          </h3>

          <section className="stack" style={{ marginTop: 16, gap: 10 }} aria-labelledby={`proj-access-summary-students-${projectId}`}>
            <h4 id={`proj-access-summary-students-${projectId}`} className="overview-title" style={{ fontSize: "var(--fs-fixed-1rem)", margin: 0 }}>
              Project student access
            </h4>
            {!studentDiff.hasChanges ? (
              <p className="muted" style={{ margin: 0 }}>No changes to project student access.</p>
            ) : (
              <>
                {studentDiff.added.length > 0 ? (
                  <div>
                    <p className="muted" style={{ margin: "0 0 6px" }}>Adding ({studentDiff.added.length})</p>
                    <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 4 }}>
                      {studentDiff.added.map((id) => (
                        <li key={`add-${id}`}>{idToLabel.get(id) ?? `User ${id}`}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {studentDiff.removed.length > 0 ? (
                  <div>
                    <p className="muted" style={{ margin: "0 0 6px" }}>Removing ({studentDiff.removed.length})</p>
                    <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 4 }}>
                      {studentDiff.removed.map((id) => (
                        <li key={`rem-${id}`}>{idToLabel.get(id) ?? `User ${id}`}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <div className="ui-row ui-row--between enterprise-modules__create-actions enterprise-module-create__actions" style={{ marginTop: 20 }}>
            <div className="ui-row">
              <Button type="button" variant="ghost" onClick={() => setPhase("edit")} disabled={saving}>
                Back to editing
              </Button>
              <Link href={moduleStudentsHref} className="btn btn--ghost">
                Open module student enrollment
              </Link>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={() => void onConfirmSave()}
              disabled={saving || detailsDisabled || !studentDiff.hasChanges}
            >
              {saving ? "Saving…" : "Save project access"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 12, gap: 18 }}>
          <div className="stack" style={{ gap: 14 }}>
            <ModuleStaffSummaryBlock title="Module leads" people={projectAccess.moduleLeaders} />
            <ModuleStaffSummaryBlock title="Teaching assistants" people={projectAccess.moduleTeachingAssistants} />
            <Link
              href={moduleStaffAccessHref}
              className="btn btn--sm btn--primary"
              style={{ justifySelf: "start", width: "fit-content" }}
            >
              Edit staff access
            </Link>
          </div>

          <div className="enterprise-module-create__field enterprise-module-create__field--access">
            <ModuleAccessSearchSection
              label="Project student access"
              helperText="Choose which module-enrolled students (excluding leads and TAs) have explicit access to this project. Students already on this project are listed first and highlighted."
              groupLabel="Eligible students"
              searchId={`project-access-students-${projectId}`}
              searchAriaLabel="Search students"
              searchPlaceholder="Search by name, email, or ID"
              searchQuery={buckets.studentSearchQuery}
              onSearchChange={buckets.setStudentSearchQuery}
              status={buckets.studentStatus}
              total={buckets.studentTotal}
              start={buckets.studentStart}
              end={buckets.studentEnd}
              users={buckets.studentUsers}
              selectedSet={studentSet}
              onToggle={toggleStudent}
              isCheckedDisabled={() => scopeBusy}
              message={null}
              page={buckets.studentPage}
              pageInput={buckets.studentPageInput}
              totalPages={buckets.studentTotalPages}
              pageInputId={`project-access-students-page-${projectId}`}
              pageJumpAriaLabel="Go to students page"
              onPageInputChange={buckets.setStudentPageInput}
              onPageInputBlur={() => buckets.applyStudentPageInput(buckets.studentPageInput)}
              onCommitPageJump={() => buckets.applyStudentPageInput(buckets.studentPageInput)}
              onPreviousPage={() => buckets.setStudentPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() =>
                buckets.setStudentPage((prev) => Math.min(Math.max(1, buckets.studentTotalPages), prev + 1))
              }
              loadingLabel="Loading…"
              zeroLabel="Showing 0 accounts"
              noResultsLabel={(query) => `No students match "${query}".`}
              emptyLabel="No eligible students on this module."
              selectedCountLabel={`${studentIds.length} selected for this project`}
              baselineSelectedSet={baselineStudentSet}
              onlyWithoutModuleAccess={hideStudentsAlreadyOnProject}
              onToggleOnlyWithoutModuleAccess={() => setHideStudentsAlreadyOnProject((prev) => !prev)}
              onlyWithoutModuleAccessDisabled={scopeBusy}
              onlyWithoutAccessLabel="Hide students already on this project"
              prioritisedSet={baselineStudentSet}
            />
          </div>

          <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
            <Button type="button" variant="primary" onClick={onReview} disabled={scopeBusy}>
              Review changes
            </Button>
          </div>
        </div>
      )}
    </StaffProjectManageFormCollapsible>
  );
}
