"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearStaffStudentDeadlineOverride,
  getStaffStudentDeadlineOverrides,
  upsertStaffStudentDeadlineOverride,
} from "@/features/projects/api/client";
import type { StaffStudentDeadlineOverride, StaffStudentDeadlineOverridePayload } from "@/features/projects/types";
import { filterBySearchQuery } from "@/shared/lib/search";
import { AutoGrowTextarea } from "@/shared/ui/AutoGrowTextarea";
import { SearchField } from "@/shared/ui/SearchField";
import { SkeletonText } from "@/shared/ui/Skeleton";

type StaffTeamMemberLite = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type StaffStudentDeadlineOverridesPanelProps = {
  projectId: number;
  members: StaffTeamMemberLite[];
  initialStudentId?: number | null;
  readOnly?: boolean;
};

type Draft = {
  taskOpenDate: string;
  taskDueDate: string;
  assessmentOpenDate: string;
  assessmentDueDate: string;
  feedbackOpenDate: string;
  feedbackDueDate: string;
  reason: string;
};

function toLocalDateInput(value: string | null): string {
  if (!value) {return "";}
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {return "";}
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromOverride(override?: StaffStudentDeadlineOverride): Draft {
  return {
    taskOpenDate: toLocalDateInput(override?.taskOpenDate ?? null),
    taskDueDate: toLocalDateInput(override?.taskDueDate ?? null),
    assessmentOpenDate: toLocalDateInput(override?.assessmentOpenDate ?? null),
    assessmentDueDate: toLocalDateInput(override?.assessmentDueDate ?? null),
    feedbackOpenDate: toLocalDateInput(override?.feedbackOpenDate ?? null),
    feedbackDueDate: toLocalDateInput(override?.feedbackDueDate ?? null),
    reason: override?.reason ?? "",
  };
}

function toPayload(draft: Draft): StaffStudentDeadlineOverridePayload {
  const normalize = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {return null;}
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {return null;}
    return parsed.toISOString();
  };

  const reason = draft.reason.trim();

  return {
    taskOpenDate: normalize(draft.taskOpenDate),
    taskDueDate: normalize(draft.taskDueDate),
    assessmentOpenDate: normalize(draft.assessmentOpenDate),
    assessmentDueDate: normalize(draft.assessmentDueDate),
    feedbackOpenDate: normalize(draft.feedbackOpenDate),
    feedbackDueDate: normalize(draft.feedbackDueDate),
    reason: reason ? reason : null,
  };
}

export function StaffStudentDeadlineOverridesPanel({
  projectId,
  members,
  initialStudentId,
  readOnly = false,
}: StaffStudentDeadlineOverridesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(initialStudentId ?? null);
  const [overrides, setOverrides] = useState<Record<number, StaffStudentDeadlineOverride>>({});
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    getStaffStudentDeadlineOverrides(projectId)
      .then((items) => {
        if (!isMounted) {return;}
        const nextOverrides: Record<number, StaffStudentDeadlineOverride> = {};
        for (const item of items) {
          if (memberIds.has(item.userId)) {
            nextOverrides[item.userId] = item;
          }
        }

        setOverrides(nextOverrides);
        const nextDrafts: Record<number, Draft> = {};
        for (const member of members) {
          nextDrafts[member.id] = fromOverride(nextOverrides[member.id]);
        }
        setDrafts(nextDrafts);
      })
      .catch((error) => {
        if (!isMounted) {return;}
        setLoadError(error instanceof Error ? error.message : "Failed to load student overrides.");
      })
      .finally(() => {
        if (!isMounted) {return;}
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, members, memberIds]);

  useEffect(() => {
    if (!initialStudentId) {return;}
    if (!memberIds.has(initialStudentId)) {return;}
    setExpandedStudentId(initialStudentId);
  }, [initialStudentId, memberIds]);

  const updateDraft = (studentId: number, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...patch,
      },
    }));
  };

  const filteredMembers = useMemo(
    () =>
      filterBySearchQuery(members, memberSearchQuery, {
        fields: ["firstName", "lastName", "email"],
        selectors: [(member) => `${member.firstName} ${member.lastName}`.trim()],
      }),
    [members, memberSearchQuery]
  );

  const handleSave = async (studentId: number) => {
    if (readOnly) {return;}
    const draft = drafts[studentId] ?? fromOverride(overrides[studentId]);
    setSavingStudentId(studentId);
    setActionError(null);
    try {
      const override = await upsertStaffStudentDeadlineOverride(projectId, studentId, toPayload(draft));
      setOverrides((prev) => ({ ...prev, [studentId]: override }));
      setDrafts((prev) => ({ ...prev, [studentId]: fromOverride(override) }));
      setExpandedStudentId(studentId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to save override.");
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleClear = async (studentId: number) => {
    if (readOnly) {return;}
    setSavingStudentId(studentId);
    setActionError(null);
    try {
      await clearStaffStudentDeadlineOverride(projectId, studentId);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setDrafts((prev) => ({ ...prev, [studentId]: fromOverride(undefined) }));
      setExpandedStudentId(studentId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to clear override.");
    } finally {
      setSavingStudentId(null);
    }
  };

  return (
    <section className="staff-projects__team-card" aria-label="Per-student deadline overrides">
      <h3 style={{ margin: 0 }}>Per-student deadline overrides</h3>
      <p className="muted" style={{ margin: 0 }}>
        {readOnly
          ? "This module is archived; overrides are read-only."
          : "Apply manual extensions or date changes for individual students in this team."}
      </p>

      <label className="staff-projects__field" htmlFor="student-overrides-search">
        <span className="staff-projects__field-label">Search students</span>
        <SearchField
          id="student-overrides-search"
          className="staff-projects__input"
          value={memberSearchQuery}
          onChange={(event) => setMemberSearchQuery(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search students in deadline overrides"
        />
      </label>

      {loading ? (
        <div style={{ margin: 0 }} role="status" aria-live="polite">
          <SkeletonText lines={1} widths={["30%"]} />
          <span className="ui-visually-hidden">Loading overrides...</span>
        </div>
      ) : null}
      {loadError ? <p className="staff-projects__error">{loadError}</p> : null}
      {actionError ? <p className="staff-projects__error">{actionError}</p> : null}

      <div className="staff-projects__override-list">
        {filteredMembers.length === 0 ? (
          <article className="staff-projects__override-item">
            <p className="muted" style={{ margin: 0 }}>
              {memberSearchQuery.trim().length > 0
                ? `No students match "${memberSearchQuery.trim()}".`
                : "No students are available for this team."}
            </p>
          </article>
        ) : (
          filteredMembers.map((member) => {
          const override = overrides[member.id];
          const draft = drafts[member.id] ?? fromOverride(override);
          const isExpanded = expandedStudentId === member.id;
          const isSaving = savingStudentId === member.id;

          return (
            <article key={member.id} className="staff-projects__override-item">
              <div className="staff-projects__override-head">
                <div>
                  <p className="staff-projects__member-name" style={{ margin: 0 }}>
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="staff-projects__member-email" style={{ margin: 0 }}>
                    {member.email}
                  </p>
                </div>
                <div className="staff-projects__override-head-actions">
                  <span className="staff-projects__badge">{override ? "Override active" : "Using team/project defaults"}</span>
                  <button
                    type="button"
                    className="staff-projects__chip-btn"
                    onClick={() => setExpandedStudentId((prev) => (prev === member.id ? null : member.id))}
                  >
                    {isExpanded ? "Hide" : readOnly ? "View" : "Edit"}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="staff-projects__override-editor">
                  <div className="staff-projects__deadline-grid">
                    <label className="staff-projects__field">
                      <span className="staff-projects__field-label">Task open</span>
                      <input
                        className="staff-projects__input"
                        type="datetime-local"
                        value={draft.taskOpenDate}
                        onChange={(event) => updateDraft(member.id, { taskOpenDate: event.target.value })}
                        disabled={readOnly}
                      />
                    </label>
                    <label className="staff-projects__field">
                      <span className="staff-projects__field-label">Task due</span>
                      <input
                        className="staff-projects__input"
                        type="datetime-local"
                        value={draft.taskDueDate}
                        onChange={(event) => updateDraft(member.id, { taskDueDate: event.target.value })}
                        disabled={readOnly}
                      />
                    </label>
                    <label className="staff-projects__field">
                      <span className="staff-projects__field-label">Assessment open</span>
                      <input
                        className="staff-projects__input"
                        type="datetime-local"
                        value={draft.assessmentOpenDate}
                        onChange={(event) => updateDraft(member.id, { assessmentOpenDate: event.target.value })}
                        disabled={readOnly}
                      />
                    </label>
                    <label className="staff-projects__field">
                      <span className="staff-projects__field-label">Assessment due</span>
                      <input
                        className="staff-projects__input"
                        type="datetime-local"
                        value={draft.assessmentDueDate}
                        onChange={(event) => updateDraft(member.id, { assessmentDueDate: event.target.value })}
                        disabled={readOnly}
                      />
                    </label>
                    <label className="staff-projects__field">
                      <span className="staff-projects__field-label">Feedback open</span>
                      <input
                        className="staff-projects__input"
                        type="datetime-local"
                        value={draft.feedbackOpenDate}
                        onChange={(event) => updateDraft(member.id, { feedbackOpenDate: event.target.value })}
                        disabled={readOnly}
                      />
                    </label>
                    <label className="staff-projects__field">
                      <span className="staff-projects__field-label">Feedback due</span>
                      <input
                        className="staff-projects__input"
                        type="datetime-local"
                        value={draft.feedbackDueDate}
                        onChange={(event) => updateDraft(member.id, { feedbackDueDate: event.target.value })}
                        disabled={readOnly}
                      />
                    </label>
                  </div>

                  <label className="staff-projects__field">
                    <span className="staff-projects__field-label">Reason (optional)</span>
                    <AutoGrowTextarea
                      className="staff-projects__input"
                      value={draft.reason}
                      onChange={(event) => updateDraft(member.id, { reason: event.target.value })}
                      placeholder="Reason for this student-specific override"
                      rows={3}
                      style={{ height: "auto", paddingTop: "8px", paddingBottom: "8px" }}
                      disabled={readOnly}
                    />
                  </label>

                  {readOnly ? null : (
                  <div className="staff-projects__create-actions">
                    <button
                      type="button"
                      className="staff-projects__create-submit"
                      onClick={() => handleSave(member.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save override"}
                    </button>
                    <button
                      type="button"
                      className="staff-projects__chip-btn"
                      onClick={() => handleClear(member.id)}
                      disabled={isSaving}
                    >
                      Clear override
                    </button>
                  </div>
                  )}
                </div>
              ) : null}
            </article>
          );
        })
        )}
      </div>
    </section>
  );
}
