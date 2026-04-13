import type { StaffProjectManageDeadlinePatchPayload, StaffProjectManageDeadlineSnapshot } from "@/features/projects/types";

export function deadlineToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function deadlineFromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString();
}

export type LocalDeadlineFields = {
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
};

export function deadlineSnapshotToLocal(dl: StaffProjectManageDeadlineSnapshot): LocalDeadlineFields {
  return {
    taskOpenDate: deadlineToDatetimeLocalValue(dl.taskOpenDate),
    taskDueDate: deadlineToDatetimeLocalValue(dl.taskDueDate),
    taskDueDateMcf: deadlineToDatetimeLocalValue(dl.taskDueDateMcf),
    assessmentOpenDate: deadlineToDatetimeLocalValue(dl.assessmentOpenDate),
    assessmentDueDate: deadlineToDatetimeLocalValue(dl.assessmentDueDate),
    assessmentDueDateMcf: deadlineToDatetimeLocalValue(dl.assessmentDueDateMcf),
    feedbackOpenDate: deadlineToDatetimeLocalValue(dl.feedbackOpenDate),
    feedbackDueDate: deadlineToDatetimeLocalValue(dl.feedbackDueDate),
    feedbackDueDateMcf: deadlineToDatetimeLocalValue(dl.feedbackDueDateMcf),
    teamAllocationQuestionnaireOpenDate: deadlineToDatetimeLocalValue(dl.teamAllocationQuestionnaireOpenDate),
    teamAllocationQuestionnaireDueDate: deadlineToDatetimeLocalValue(dl.teamAllocationQuestionnaireDueDate),
  };
}

export function deadlineBuildPayload(fields: LocalDeadlineFields): StaffProjectManageDeadlinePatchPayload | null {
  const core = {
    taskOpenDate: deadlineFromDatetimeLocalValue(fields.taskOpenDate),
    taskDueDate: deadlineFromDatetimeLocalValue(fields.taskDueDate),
    taskDueDateMcf: deadlineFromDatetimeLocalValue(fields.taskDueDateMcf),
    assessmentOpenDate: deadlineFromDatetimeLocalValue(fields.assessmentOpenDate),
    assessmentDueDate: deadlineFromDatetimeLocalValue(fields.assessmentDueDate),
    assessmentDueDateMcf: deadlineFromDatetimeLocalValue(fields.assessmentDueDateMcf),
    feedbackOpenDate: deadlineFromDatetimeLocalValue(fields.feedbackOpenDate),
    feedbackDueDate: deadlineFromDatetimeLocalValue(fields.feedbackDueDate),
    feedbackDueDateMcf: deadlineFromDatetimeLocalValue(fields.feedbackDueDateMcf),
  };
  if (Object.values(core).some((v) => !v)) {
    return null;
  }
  const taOpen = fields.teamAllocationQuestionnaireOpenDate.trim()
    ? deadlineFromDatetimeLocalValue(fields.teamAllocationQuestionnaireOpenDate)
    : null;
  const taDue = fields.teamAllocationQuestionnaireDueDate.trim()
    ? deadlineFromDatetimeLocalValue(fields.teamAllocationQuestionnaireDueDate)
    : null;
  return {
    ...core,
    teamAllocationQuestionnaireOpenDate: taOpen,
    teamAllocationQuestionnaireDueDate: taDue,
  };
}
