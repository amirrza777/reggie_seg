"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { patchStaffProjectManage } from "@/features/projects/api/client";
import { ApiError } from "@/shared/api/errors";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";
import {
  deadlineSnapshotToLocal,
  deadlineBuildPayload,
  type LocalDeadlineFields,
} from "./StaffProjectManageProjectDeadlinesSection.lib";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString();
}

type LocalDeadlineFields = {
  taskOpenDate: string;
  taskDueDate: string;
  taskDueDateMcf: string;
  assessmentOpenDate: string;
  assessmentDueDate: string;
  assessmentDueDateMcf: string;
  feedbackOpenDate: string;
  feedbackDueDate: string;
  feedbackDueDateMcf: string;
  teamAllocationQuestionnaireOpenDate: string;
  teamAllocationQuestionnaireDueDate: string;
  teamAllocationInviteDueDate: string;
};

function snapshotToLocal(dl: StaffProjectManageDeadlineSnapshot): LocalDeadlineFields {
  return {
    taskOpenDate: toDatetimeLocalValue(dl.taskOpenDate),
    taskDueDate: toDatetimeLocalValue(dl.taskDueDate),
    taskDueDateMcf: toDatetimeLocalValue(dl.taskDueDateMcf),
    assessmentOpenDate: toDatetimeLocalValue(dl.assessmentOpenDate),
    assessmentDueDate: toDatetimeLocalValue(dl.assessmentDueDate),
    assessmentDueDateMcf: toDatetimeLocalValue(dl.assessmentDueDateMcf),
    feedbackOpenDate: toDatetimeLocalValue(dl.feedbackOpenDate),
    feedbackDueDate: toDatetimeLocalValue(dl.feedbackDueDate),
    feedbackDueDateMcf: toDatetimeLocalValue(dl.feedbackDueDateMcf),
    teamAllocationQuestionnaireOpenDate: toDatetimeLocalValue(dl.teamAllocationQuestionnaireOpenDate),
    teamAllocationQuestionnaireDueDate: toDatetimeLocalValue(dl.teamAllocationQuestionnaireDueDate),
    teamAllocationInviteDueDate: toDatetimeLocalValue(dl.teamAllocationInviteDueDate),
  };
}

function buildPayload(fields: LocalDeadlineFields): StaffProjectManageDeadlinePatchPayload | null {
  const core = {
    taskOpenDate: fromDatetimeLocalValue(fields.taskOpenDate),
    taskDueDate: fromDatetimeLocalValue(fields.taskDueDate),
    taskDueDateMcf: fromDatetimeLocalValue(fields.taskDueDateMcf),
    assessmentOpenDate: fromDatetimeLocalValue(fields.assessmentOpenDate),
    assessmentDueDate: fromDatetimeLocalValue(fields.assessmentDueDate),
    assessmentDueDateMcf: fromDatetimeLocalValue(fields.assessmentDueDateMcf),
    feedbackOpenDate: fromDatetimeLocalValue(fields.feedbackOpenDate),
    feedbackDueDate: fromDatetimeLocalValue(fields.feedbackDueDate),
    feedbackDueDateMcf: fromDatetimeLocalValue(fields.feedbackDueDateMcf),
  };
  if (Object.values(core).some((v) => !v)) {
    return null;
  }
  const taOpen = fields.teamAllocationQuestionnaireOpenDate.trim()
    ? fromDatetimeLocalValue(fields.teamAllocationQuestionnaireOpenDate)
    : null;
  const taDue = fields.teamAllocationQuestionnaireDueDate.trim()
    ? fromDatetimeLocalValue(fields.teamAllocationQuestionnaireDueDate)
    : null;
  const inviteDue = fields.teamAllocationInviteDueDate.trim()
    ? fromDatetimeLocalValue(fields.teamAllocationInviteDueDate)
    : null;
  return {
    ...core,
    teamAllocationQuestionnaireOpenDate: taOpen,
    teamAllocationQuestionnaireDueDate: taDue,
    teamAllocationInviteDueDate: inviteDue,
  };
}

type RowProps = { label: string; name: keyof LocalDeadlineFields; value: string; onChange: (v: string) => void; disabled: boolean };

function DeadlineRow({ label, name, value, onChange, disabled }: RowProps) {
  return (
    <label className="staff-projects__field" style={{ marginTop: 8 }}>
      <span className="staff-projects__field-label">{label}</span>
      <input
        type="datetime-local"
        name={name}
        className="staff-projects__input"
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}

export function StaffProjectManageProjectDeadlinesSection() {
  const router = useRouter();
  const { projectId, initial, detailsDisabled } = useStaffProjectManageSetup();
  const [fields, setFields] = useState<LocalDeadlineFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const snapshot = initial.projectDeadline;

  useEffect(() => {
    if (snapshot) {
      setFields(deadlineSnapshotToLocal(snapshot));
    } else {
      setFields(null);
    }
  }, [snapshot]);

  const disabled = detailsDisabled || saving || !fields;

  const setField = useCallback((key: keyof LocalDeadlineFields, value: string) => {
    setFields((prev) => {
      /* v8 ignore next 2 -- setField is only used once fields have hydrated */
      if (!prev) {
        return prev;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const onDeadlineFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const key = event.target.name as keyof LocalDeadlineFields;
      setField(key, event.target.value);
    },
    [setField],
  );

  const onSave = useCallback(async () => {
    /* v8 ignore next -- save is disabled until fields hydrate; guard kept for safety */
    if (!fields) {
      return;
    }
    const payload = deadlineBuildPayload(fields);
    if (!payload) {
      setSaveError("Each required deadline must have a valid date and time.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      await patchStaffProjectManage(projectId, { deadline: payload });
      setSaveOk("Project deadlines updated.");
      router.refresh();
    } catch (e: unknown) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save deadlines.");
    } finally {
      setSaving(false);
    }
  }, [fields, projectId, router]);

  const handleSaveClick = useCallback(() => {
    void onSave();
  }, [onSave]);

  const hint = useMemo(
    () =>
      "These dates apply project-wide before team or student overrides. Times use your local timezone and are stored in UTC.",
    [],
  );

  if (!snapshot || !fields) {
    return (
      <StaffProjectManageFormCollapsible title="Project deadlines" defaultOpen={false}>
        <p className="muted">No project deadline record is available for this project.</p>
      </StaffProjectManageFormCollapsible>
    );
  }

  return (
    <StaffProjectManageFormCollapsible title="Project deadlines" defaultOpen={false}>
      <p className="ui-note ui-note--muted">{hint}</p>

      <fieldset className="staff-projects__deadline" style={{ marginTop: 12 }}>
        <legend className="staff-projects__field-label">Standard timeline</legend>
        <DeadlineRow label="Task opens" name="taskOpenDate" value={fields.taskOpenDate} disabled={disabled} onChange={onDeadlineFieldChange} />
        <DeadlineRow label="Task due" name="taskDueDate" value={fields.taskDueDate} disabled={disabled} onChange={onDeadlineFieldChange} />
        <DeadlineRow
          label="Assessment opens"
          name="assessmentOpenDate"
          value={fields.assessmentOpenDate}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Assessment due"
          name="assessmentDueDate"
          value={fields.assessmentDueDate}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Feedback opens"
          name="feedbackOpenDate"
          value={fields.feedbackOpenDate}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Feedback due"
          name="feedbackDueDate"
          value={fields.feedbackDueDate}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
      </fieldset>

      <fieldset className="staff-projects__deadline" style={{ marginTop: 16 }}>
        <legend className="staff-projects__field-label">MCF extended due dates</legend>
        <DeadlineRow
          label="Task due (MCF)"
          name="taskDueDateMcf"
          value={fields.taskDueDateMcf}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Assessment due (MCF)"
          name="assessmentDueDateMcf"
          value={fields.assessmentDueDateMcf}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Feedback due (MCF)"
          name="feedbackDueDateMcf"
          value={fields.feedbackDueDateMcf}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
      </fieldset>

      <fieldset className="staff-projects__deadline" style={{ marginTop: 16 }}>
        <legend className="staff-projects__field-label">Team allocation questionnaire (optional)</legend>
        <DeadlineRow
          label="Opens"
          name="teamAllocationQuestionnaireOpenDate"
          value={fields.teamAllocationQuestionnaireOpenDate}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Due"
          name="teamAllocationQuestionnaireDueDate"
          value={fields.teamAllocationQuestionnaireDueDate}
          disabled={disabled}
          onChange={onDeadlineFieldChange}
        />
        <DeadlineRow
          label="Team invite deadline"
          name="teamAllocationInviteDueDate"
          value={fields.teamAllocationInviteDueDate}
          disabled={disabled}
          onChange={(v) => setField("teamAllocationInviteDueDate", v)}
        />
      </fieldset>

      <button type="button" className="btn btn--primary" style={{ marginTop: 16 }} disabled={disabled} onClick={handleSaveClick}>
        {saving ? "Saving…" : "Save deadlines"}
      </button>

      {saveOk ? <p className="staff-projects__success">{saveOk}</p> : null}
      {saveError ? <p className="staff-projects__error">{saveError}</p> : null}
    </StaffProjectManageFormCollapsible>
  );
}
