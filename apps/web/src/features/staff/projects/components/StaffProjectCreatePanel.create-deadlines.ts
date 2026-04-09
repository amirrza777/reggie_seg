import type { ModuleStudent } from "@/features/modules/types";
import type { DeadlineState } from "./StaffProjectCreatePanel.deadlines";

export type CreateProjectDeadlineState = DeadlineState & {
  teamAllocationQuestionnaireOpenDate: string;
  teamAllocationQuestionnaireDueDate: string;
};

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
  const questionnaireDue = new Date(taskOpen.getTime() - 24 * 60 * 60 * 1000);
  const questionnaireOpen = new Date(taskOpen.getTime() - 8 * 24 * 60 * 60 * 1000);
  return {
    taskOpenDate: toLocalDateTimeInputValue(taskOpen),
    taskDueDate: toLocalDateTimeInputValue(taskDue),
    taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
    feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    teamAllocationQuestionnaireOpenDate: toLocalDateTimeInputValue(questionnaireOpen),
    teamAllocationQuestionnaireDueDate: toLocalDateTimeInputValue(questionnaireDue),
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
  const questionnaireDue = new Date(taskOpen.getTime() - 24 * 60 * 60 * 1000);
  const questionnaireOpen = new Date(taskOpen.getTime() - 8 * 24 * 60 * 60 * 1000);
  return {
    taskOpenDate: toLocalDateTimeInputValue(taskOpen),
    taskDueDate: toLocalDateTimeInputValue(taskDue),
    taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
    feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    teamAllocationQuestionnaireOpenDate: toLocalDateTimeInputValue(questionnaireOpen),
    teamAllocationQuestionnaireDueDate: toLocalDateTimeInputValue(questionnaireDue),
  };
}

export function toStudentName(student: ModuleStudent) {
  const fullName = `${student.firstName} ${student.lastName}`.trim();
  return fullName.length > 0 ? fullName : student.email;
}