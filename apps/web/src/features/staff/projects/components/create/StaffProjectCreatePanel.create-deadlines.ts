import type { ModuleStudent } from "@/features/modules/types";
import type { DeadlineState } from "./StaffProjectCreatePanel.deadlines";

export type CreateProjectDeadlineState = DeadlineState & {
  teamAllocationQuestionnaireOpenDate: string;
  teamAllocationQuestionnaireDueDate: string;
  teamAllocationInviteDueDate: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalDateTimeInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function buildDefaultCreateProjectDeadlineState(): CreateProjectDeadlineState {
  const taskOpen = new Date();
  taskOpen.setMinutes(0, 0, 0);
  taskOpen.setHours(taskOpen.getHours() + 1);
  const taskDue = new Date(taskOpen.getTime() + 14 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 4 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 4 * 24 * 60 * 60 * 1000);
  const questionnaireDue = new Date(taskOpen.getTime() - DAY_MS);
  const questionnaireOpen = new Date(taskOpen.getTime() - 8 * DAY_MS);
  const inviteDue = new Date(taskOpen.getTime());
  return {
    taskOpenDate: toLocalDateTimeInputValue(taskOpen),
    taskDueDate: toLocalDateTimeInputValue(taskDue),
    taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDue.getTime() + 7 * DAY_MS)),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDue.getTime() + 7 * DAY_MS)),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
    feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDue.getTime() + 7 * DAY_MS)),
    teamAllocationQuestionnaireOpenDate: toLocalDateTimeInputValue(questionnaireOpen),
    teamAllocationQuestionnaireDueDate: toLocalDateTimeInputValue(questionnaireDue),
    teamAllocationInviteDueDate: toLocalDateTimeInputValue(inviteDue),
  };
}

export function buildPresetCreateProjectDeadlineState(totalWeeks: number): CreateProjectDeadlineState {
  const taskOpen = new Date();
  taskOpen.setMinutes(0, 0, 0);
  taskOpen.setHours(taskOpen.getHours() + 1);
  const taskDue = new Date(taskOpen.getTime() + totalWeeks * 7 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 5 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 5 * 24 * 60 * 60 * 1000);
  const questionnaireDue = new Date(taskOpen.getTime() - DAY_MS);
  const questionnaireOpen = new Date(taskOpen.getTime() - 8 * DAY_MS);
  return {
    taskOpenDate: toLocalDateTimeInputValue(taskOpen),
    taskDueDate: toLocalDateTimeInputValue(taskDue),
    taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDue.getTime() + 7 * DAY_MS)),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDue.getTime() + 7 * DAY_MS)),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
    feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDue.getTime() + 7 * DAY_MS)),
    teamAllocationQuestionnaireOpenDate: toLocalDateTimeInputValue(questionnaireOpen),
    teamAllocationQuestionnaireDueDate: toLocalDateTimeInputValue(questionnaireDue),
    teamAllocationInviteDueDate: "",
  };
}

function parseLocalDateTimeInputValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * When custom allocation is enabled, move the whole timeline by one week and
 * make the questionnaire start the next day in default flows.
 */
export function shiftCreateProjectDeadlineForCustomAllocation(
  deadline: CreateProjectDeadlineState,
  shiftDays = 7,
): CreateProjectDeadlineState {
  const shiftMs = shiftDays * DAY_MS;
  const next = { ...deadline };

  const shiftField = (field: keyof DeadlineState) => {
    const parsed = parseLocalDateTimeInputValue(deadline[field]);
    if (!parsed) return;
    next[field] = toLocalDateTimeInputValue(new Date(parsed.getTime() + shiftMs));
  };

  shiftField("taskOpenDate");
  shiftField("taskDueDate");
  shiftField("taskDueDateMcf");
  shiftField("assessmentOpenDate");
  shiftField("assessmentDueDate");
  shiftField("assessmentDueDateMcf");
  shiftField("feedbackOpenDate");
  shiftField("feedbackDueDate");
  shiftField("feedbackDueDateMcf");

  const shiftedTaskOpen = parseLocalDateTimeInputValue(next.taskOpenDate);
  if (shiftedTaskOpen) {
    const questionnaireDue = new Date(shiftedTaskOpen.getTime() - DAY_MS);
    const questionnaireOpen = new Date(shiftedTaskOpen.getTime() - 6 * DAY_MS);
    const inviteDue = new Date(shiftedTaskOpen.getTime());
    next.teamAllocationQuestionnaireOpenDate = toLocalDateTimeInputValue(questionnaireOpen);
    next.teamAllocationQuestionnaireDueDate = toLocalDateTimeInputValue(questionnaireDue);
    next.teamAllocationInviteDueDate = toLocalDateTimeInputValue(inviteDue);
  }

  return next;
}

export function toStudentName(student: ModuleStudent) {
  const fullName = `${student.firstName} ${student.lastName}`.trim();
  return fullName.length > 0 ? fullName : student.email;
}
