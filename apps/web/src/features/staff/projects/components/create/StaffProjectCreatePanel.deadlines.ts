export type DeadlineState = {
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

export type ParsedDeadlineState = {
  taskOpenDate: Date;
  taskDueDate: Date;
  taskDueDateMcf: Date;
  assessmentOpenDate: Date;
  assessmentDueDate: Date;
  assessmentDueDateMcf: Date;
  feedbackOpenDate: Date;
  feedbackDueDate: Date;
  feedbackDueDateMcf: Date;
  teamAllocationQuestionnaireOpenDate: Date | null;
  teamAllocationQuestionnaireDueDate: Date | null;
};

export type DeadlinePreview = {
  taskOpenDate: Date | null;
  taskDueDate: Date | null;
  taskDueDateMcf: Date | null;
  assessmentOpenDate: Date | null;
  assessmentDueDate: Date | null;
  assessmentDueDateMcf: Date | null;
  feedbackOpenDate: Date | null;
  feedbackDueDate: Date | null;
  feedbackDueDateMcf: Date | null;
  teamAllocationQuestionnaireOpenDate: Date | null;
  teamAllocationQuestionnaireDueDate: Date | null;
  totalDays: number | null;
};

function toLocalDateTimeInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function parseLocalDateTime(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatDateTime(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildDefaultDeadlineState(): DeadlineState {
  const taskOpen = new Date();
  taskOpen.setMinutes(0, 0, 0);
  taskOpen.setHours(taskOpen.getHours() + 1);

  const taskDue = new Date(taskOpen.getTime() + 14 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 4 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 4 * 24 * 60 * 60 * 1000);

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
    teamAllocationQuestionnaireOpenDate: "",
    teamAllocationQuestionnaireDueDate: "",
  };
}

export function buildPresetDeadlineState(totalWeeks: number): DeadlineState {
  const taskOpen = new Date();
  taskOpen.setMinutes(0, 0, 0);
  taskOpen.setHours(taskOpen.getHours() + 1);

  const taskDue = new Date(taskOpen.getTime() + totalWeeks * 7 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 5 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 5 * 24 * 60 * 60 * 1000);

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
    teamAllocationQuestionnaireOpenDate: "",
    teamAllocationQuestionnaireDueDate: "",
  };
}

export function applyMcfOffsetDaysToDeadlineState(deadline: DeadlineState, offsetDays: number) {
  const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
  const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
  const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);

  if (!taskDueDate || !assessmentDueDate || !feedbackDueDate) {
    return {
      ok: false as const,
      error: "Set valid standard due dates first, then apply an MCF offset.",
    };
  }

  const deltaMs = offsetDays * 24 * 60 * 60 * 1000;
  return {
    ok: true as const,
    value: {
      ...deadline,
      taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDueDate.getTime() + deltaMs)),
      assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDueDate.getTime() + deltaMs)),
      feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDueDate.getTime() + deltaMs)),
    },
  };
}

export function buildDeadlinePreview(deadline: DeadlineState): DeadlinePreview {
  const taskOpenDate = parseLocalDateTime(deadline.taskOpenDate);
  const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
  const taskDueDateMcf = parseLocalDateTime(deadline.taskDueDateMcf);
  const assessmentOpenDate = parseLocalDateTime(deadline.assessmentOpenDate);
  const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
  const assessmentDueDateMcf = parseLocalDateTime(deadline.assessmentDueDateMcf);
  const feedbackOpenDate = parseLocalDateTime(deadline.feedbackOpenDate);
  const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);
  const feedbackDueDateMcf = parseLocalDateTime(deadline.feedbackDueDateMcf);
  const teamAllocationQuestionnaireOpenDate = parseLocalDateTime(deadline.teamAllocationQuestionnaireOpenDate);
  const teamAllocationQuestionnaireDueDate = parseLocalDateTime(deadline.teamAllocationQuestionnaireDueDate);
  const rangeStart = taskOpenDate;
  const rangeEnd = feedbackDueDate;
  const totalDays =
    rangeStart && rangeEnd
      ? Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)))
      : null;

  return {
    taskOpenDate,
    taskDueDate,
    taskDueDateMcf,
    assessmentOpenDate,
    assessmentDueDate,
    assessmentDueDateMcf,
    feedbackOpenDate,
    feedbackDueDate,
    feedbackDueDateMcf,
    teamAllocationQuestionnaireOpenDate,
    teamAllocationQuestionnaireDueDate,
    totalDays,
  };
}

export function parseAndValidateDeadlineState(deadline: DeadlineState) {
  const taskOpenDate = parseLocalDateTime(deadline.taskOpenDate);
  const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
  const taskDueDateMcf = parseLocalDateTime(deadline.taskDueDateMcf);
  const assessmentOpenDate = parseLocalDateTime(deadline.assessmentOpenDate);
  const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
  const assessmentDueDateMcf = parseLocalDateTime(deadline.assessmentDueDateMcf);
  const feedbackOpenDate = parseLocalDateTime(deadline.feedbackOpenDate);
  const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);
  const feedbackDueDateMcf = parseLocalDateTime(deadline.feedbackDueDateMcf);

  if (
    !taskOpenDate ||
    !taskDueDate ||
    !taskDueDateMcf ||
    !assessmentOpenDate ||
    !assessmentDueDate ||
    !assessmentDueDateMcf ||
    !feedbackOpenDate ||
    !feedbackDueDate ||
    !feedbackDueDateMcf
  ) {
    return { ok: false as const, error: "All deadline fields must be valid dates." };
  }

  if (taskOpenDate >= taskDueDate) {
    return { ok: false as const, error: "Task open must be before task due." };
  }
  if (taskDueDate > assessmentOpenDate) {
    return { ok: false as const, error: "Assessment open must be on or after task due." };
  }
  if (assessmentOpenDate >= assessmentDueDate) {
    return { ok: false as const, error: "Assessment open must be before assessment due." };
  }
  if (assessmentDueDate > feedbackOpenDate) {
    return { ok: false as const, error: "Feedback open must be on or after assessment due." };
  }
  if (feedbackOpenDate >= feedbackDueDate) {
    return { ok: false as const, error: "Feedback open must be before feedback due." };
  }
  if (taskDueDateMcf < taskDueDate) {
    return { ok: false as const, error: "MCF task due must be on or after standard task due." };
  }
  if (assessmentDueDateMcf < assessmentDueDate) {
    return { ok: false as const, error: "MCF assessment due must be on or after standard assessment due." };
  }
  if (feedbackDueDateMcf < feedbackDueDate) {
    return { ok: false as const, error: "MCF feedback due must be on or after standard feedback due." };
  }

  return {
    ok: true as const,
    value: {
      taskOpenDate,
      taskDueDate,
      taskDueDateMcf,
      assessmentOpenDate,
      assessmentDueDate,
      assessmentDueDateMcf,
      feedbackOpenDate,
      feedbackDueDate,
      feedbackDueDateMcf,
    } satisfies ParsedDeadlineState,
  };
}
