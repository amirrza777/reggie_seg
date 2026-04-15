import type { ParseResult } from "../../../shared/parse.js";
import { parseIsoDate, parseOptionalIsoDate, parseOptionalTrimmedString } from "../../../shared/parse.js";

export type ParsedProjectDeadline = {
  taskOpenDate: Date;
  taskDueDate: Date;
  taskDueDateMcf: Date;
  assessmentOpenDate: Date;
  assessmentDueDate: Date;
  assessmentDueDateMcf: Date;
  feedbackOpenDate: Date;
  feedbackDueDate: Date;
  feedbackDueDateMcf: Date;
  teamAllocationQuestionnaireOpenDate?: Date | null;
  teamAllocationQuestionnaireDueDate?: Date | null;
};

export type ParsedStudentDeadlineOverride = {
  taskOpenDate?: Date | null;
  taskDueDate?: Date | null;
  assessmentOpenDate?: Date | null;
  assessmentDueDate?: Date | null;
  feedbackOpenDate?: Date | null;
  feedbackDueDate?: Date | null;
  reason?: string | null;
};

export function parseStudentDeadlineOverridePayload(
  value: unknown,
): ParseResult<ParsedStudentDeadlineOverride> {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Override payload must be an object" };
  }

  const raw = value as Record<string, unknown>;
  const taskOpenDate = parseOptionalIsoDate(raw.taskOpenDate, "taskOpenDate");
  if (!taskOpenDate.ok) return taskOpenDate;
  const taskDueDate = parseOptionalIsoDate(raw.taskDueDate, "taskDueDate");
  if (!taskDueDate.ok) return taskDueDate;
  const assessmentOpenDate = parseOptionalIsoDate(raw.assessmentOpenDate, "assessmentOpenDate");
  if (!assessmentOpenDate.ok) return assessmentOpenDate;
  const assessmentDueDate = parseOptionalIsoDate(raw.assessmentDueDate, "assessmentDueDate");
  if (!assessmentDueDate.ok) return assessmentDueDate;
  const feedbackOpenDate = parseOptionalIsoDate(raw.feedbackOpenDate, "feedbackOpenDate");
  if (!feedbackOpenDate.ok) return feedbackOpenDate;
  const feedbackDueDate = parseOptionalIsoDate(raw.feedbackDueDate, "feedbackDueDate");
  if (!feedbackDueDate.ok) return feedbackDueDate;

  const parsedReason = raw.reason === null ? { ok: true as const, value: null } : parseOptionalTrimmedString(raw.reason, "reason");
  if (!parsedReason.ok) return { ok: false, error: "reason must be a string, null, or omitted" };
  const reason = parsedReason.value;

  const parsedValue: ParsedStudentDeadlineOverride = {};
  if (taskOpenDate.value !== undefined) parsedValue.taskOpenDate = taskOpenDate.value;
  if (taskDueDate.value !== undefined) parsedValue.taskDueDate = taskDueDate.value;
  if (assessmentOpenDate.value !== undefined) parsedValue.assessmentOpenDate = assessmentOpenDate.value;
  if (assessmentDueDate.value !== undefined) parsedValue.assessmentDueDate = assessmentDueDate.value;
  if (feedbackOpenDate.value !== undefined) parsedValue.feedbackOpenDate = feedbackOpenDate.value;
  if (feedbackDueDate.value !== undefined) parsedValue.feedbackDueDate = feedbackDueDate.value;
  if (reason !== undefined) parsedValue.reason = reason;

  return {
    ok: true,
    value: parsedValue,
  };
}

export function parseProjectDeadline(
  value: unknown,
): ParseResult<ParsedProjectDeadline> {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "deadline is required" };
  }

  const taskOpenDate = parseIsoDate((value as any).taskOpenDate, "deadline.taskOpenDate");
  if (!taskOpenDate.ok) return taskOpenDate;
  const taskDueDate = parseIsoDate((value as any).taskDueDate, "deadline.taskDueDate");
  if (!taskDueDate.ok) return taskDueDate;
  const taskDueDateMcf = parseIsoDate((value as any).taskDueDateMcf, "deadline.taskDueDateMcf");
  if (!taskDueDateMcf.ok) return taskDueDateMcf;
  const assessmentOpenDate = parseIsoDate((value as any).assessmentOpenDate, "deadline.assessmentOpenDate");
  if (!assessmentOpenDate.ok) return assessmentOpenDate;
  const assessmentDueDate = parseIsoDate((value as any).assessmentDueDate, "deadline.assessmentDueDate");
  if (!assessmentDueDate.ok) return assessmentDueDate;
  const assessmentDueDateMcf = parseIsoDate((value as any).assessmentDueDateMcf, "deadline.assessmentDueDateMcf");
  if (!assessmentDueDateMcf.ok) return assessmentDueDateMcf;
  const feedbackOpenDate = parseIsoDate((value as any).feedbackOpenDate, "deadline.feedbackOpenDate");
  if (!feedbackOpenDate.ok) return feedbackOpenDate;
  const feedbackDueDate = parseIsoDate((value as any).feedbackDueDate, "deadline.feedbackDueDate");
  if (!feedbackDueDate.ok) return feedbackDueDate;
  const feedbackDueDateMcf = parseIsoDate((value as any).feedbackDueDateMcf, "deadline.feedbackDueDateMcf");
  if (!feedbackDueDateMcf.ok) return feedbackDueDateMcf;
  const teamAllocationQuestionnaireOpenDate = parseOptionalIsoDate(
    (value as any).teamAllocationQuestionnaireOpenDate,
    "deadline.teamAllocationQuestionnaireOpenDate",
  );
  if (!teamAllocationQuestionnaireOpenDate.ok) return teamAllocationQuestionnaireOpenDate;
  const teamAllocationQuestionnaireDueDate = parseOptionalIsoDate(
    (value as any).teamAllocationQuestionnaireDueDate,
    "deadline.teamAllocationQuestionnaireDueDate",
  );
  if (!teamAllocationQuestionnaireDueDate.ok) return teamAllocationQuestionnaireDueDate;
  if (taskOpenDate.value >= taskDueDate.value) {
    return { ok: false, error: "deadline.taskOpenDate must be before deadline.taskDueDate" };
  }
  if (taskDueDate.value > assessmentOpenDate.value) {
    return { ok: false, error: "deadline.assessmentOpenDate must be on or after deadline.taskDueDate" };
  }
  if (assessmentOpenDate.value >= assessmentDueDate.value) {
    return { ok: false, error: "deadline.assessmentOpenDate must be before deadline.assessmentDueDate" };
  }
  if (assessmentDueDate.value > feedbackOpenDate.value) {
    return { ok: false, error: "deadline.feedbackOpenDate must be on or after deadline.assessmentDueDate" };
  }
  if (feedbackOpenDate.value >= feedbackDueDate.value) {
    return { ok: false, error: "deadline.feedbackOpenDate must be before deadline.feedbackDueDate" };
  }
  if (taskDueDateMcf.value < taskDueDate.value) {
    return { ok: false, error: "deadline.taskDueDateMcf must be on or after deadline.taskDueDate" };
  }
  if (assessmentDueDateMcf.value < assessmentDueDate.value) {
    return { ok: false, error: "deadline.assessmentDueDateMcf must be on or after deadline.assessmentDueDate" };
  }
  if (feedbackDueDateMcf.value < feedbackDueDate.value) {
    return { ok: false, error: "deadline.feedbackDueDateMcf must be on or after deadline.feedbackDueDate" };
  }
  if (
    teamAllocationQuestionnaireOpenDate.value &&
    teamAllocationQuestionnaireDueDate.value &&
    teamAllocationQuestionnaireOpenDate.value >= teamAllocationQuestionnaireDueDate.value
  ) {
    return {
      ok: false,
      error:
        "deadline.teamAllocationQuestionnaireOpenDate must be before deadline.teamAllocationQuestionnaireDueDate",
    };
  }
  if (
    teamAllocationQuestionnaireDueDate.value &&
    teamAllocationQuestionnaireDueDate.value >= taskOpenDate.value
  ) {
    return {
      ok: false,
      error: "deadline.teamAllocationQuestionnaireDueDate must be before deadline.taskOpenDate",
    };
  }
  return {
    ok: true,
    value: {
      taskOpenDate: taskOpenDate.value,
      taskDueDate: taskDueDate.value,
      taskDueDateMcf: taskDueDateMcf.value,
      assessmentOpenDate: assessmentOpenDate.value,
      assessmentDueDate: assessmentDueDate.value,
      assessmentDueDateMcf: assessmentDueDateMcf.value,
      feedbackOpenDate: feedbackOpenDate.value,
      feedbackDueDate: feedbackDueDate.value,
      feedbackDueDateMcf: feedbackDueDateMcf.value,
      ...(teamAllocationQuestionnaireOpenDate.value !== undefined
        ? { teamAllocationQuestionnaireOpenDate: teamAllocationQuestionnaireOpenDate.value }
        : {}),
      ...(teamAllocationQuestionnaireDueDate.value !== undefined
        ? { teamAllocationQuestionnaireDueDate: teamAllocationQuestionnaireDueDate.value }
        : {}),
    },
  };
}
