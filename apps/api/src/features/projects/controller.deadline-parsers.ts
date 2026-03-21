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

function parseIsoDate(value: unknown, field: keyof ParsedProjectDeadline): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseOptionalIsoDateField(
  value: unknown,
  fieldName: keyof Omit<ParsedStudentDeadlineOverride, "reason">,
): { ok: true; value: Date | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${fieldName} must be a valid date string, null, or omitted` };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date string` };
  }
  return { ok: true, value: parsed };
}

export function parseStudentDeadlineOverridePayload(
  value: unknown,
): { ok: true; value: ParsedStudentDeadlineOverride } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Override payload must be an object" };
  }

  const raw = value as Record<string, unknown>;
  const taskOpenDate = parseOptionalIsoDateField(raw.taskOpenDate, "taskOpenDate");
  if (!taskOpenDate.ok) return taskOpenDate;
  const taskDueDate = parseOptionalIsoDateField(raw.taskDueDate, "taskDueDate");
  if (!taskDueDate.ok) return taskDueDate;
  const assessmentOpenDate = parseOptionalIsoDateField(raw.assessmentOpenDate, "assessmentOpenDate");
  if (!assessmentOpenDate.ok) return assessmentOpenDate;
  const assessmentDueDate = parseOptionalIsoDateField(raw.assessmentDueDate, "assessmentDueDate");
  if (!assessmentDueDate.ok) return assessmentDueDate;
  const feedbackOpenDate = parseOptionalIsoDateField(raw.feedbackOpenDate, "feedbackOpenDate");
  if (!feedbackOpenDate.ok) return feedbackOpenDate;
  const feedbackDueDate = parseOptionalIsoDateField(raw.feedbackDueDate, "feedbackDueDate");
  if (!feedbackDueDate.ok) return feedbackDueDate;

  let reason: string | null | undefined = undefined;
  if (raw.reason !== undefined) {
    if (raw.reason === null || raw.reason === "") {
      reason = null;
    } else if (typeof raw.reason === "string") {
      const normalizedReason = raw.reason.trim();
      reason = normalizedReason.length > 0 ? normalizedReason : null;
    } else {
      return { ok: false, error: "reason must be a string, null, or omitted" };
    }
  }

  return {
    ok: true,
    value: {
      taskOpenDate: taskOpenDate.value,
      taskDueDate: taskDueDate.value,
      assessmentOpenDate: assessmentOpenDate.value,
      assessmentDueDate: assessmentDueDate.value,
      feedbackOpenDate: feedbackOpenDate.value,
      feedbackDueDate: feedbackDueDate.value,
      reason,
    },
  };
}

export function parseProjectDeadline(
  value: unknown,
): { ok: true; value: ParsedProjectDeadline } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "deadline is required" };
  }

  const taskOpenDate = parseIsoDate((value as any).taskOpenDate, "taskOpenDate");
  const taskDueDate = parseIsoDate((value as any).taskDueDate, "taskDueDate");
  const taskDueDateMcf = parseIsoDate((value as any).taskDueDateMcf, "taskDueDateMcf");
  const assessmentOpenDate = parseIsoDate((value as any).assessmentOpenDate, "assessmentOpenDate");
  const assessmentDueDate = parseIsoDate((value as any).assessmentDueDate, "assessmentDueDate");
  const assessmentDueDateMcf = parseIsoDate((value as any).assessmentDueDateMcf, "assessmentDueDateMcf");
  const feedbackOpenDate = parseIsoDate((value as any).feedbackOpenDate, "feedbackOpenDate");
  const feedbackDueDate = parseIsoDate((value as any).feedbackDueDate, "feedbackDueDate");
  const feedbackDueDateMcf = parseIsoDate((value as any).feedbackDueDateMcf, "feedbackDueDateMcf");

  if (!taskOpenDate) return { ok: false, error: "deadline.taskOpenDate must be a valid date string" };
  if (!taskDueDate) return { ok: false, error: "deadline.taskDueDate must be a valid date string" };
  if (!taskDueDateMcf) return { ok: false, error: "deadline.taskDueDateMcf must be a valid date string" };
  if (!assessmentOpenDate) return { ok: false, error: "deadline.assessmentOpenDate must be a valid date string" };
  if (!assessmentDueDate) return { ok: false, error: "deadline.assessmentDueDate must be a valid date string" };
  if (!assessmentDueDateMcf) return { ok: false, error: "deadline.assessmentDueDateMcf must be a valid date string" };
  if (!feedbackOpenDate) return { ok: false, error: "deadline.feedbackOpenDate must be a valid date string" };
  if (!feedbackDueDate) return { ok: false, error: "deadline.feedbackDueDate must be a valid date string" };
  if (!feedbackDueDateMcf) return { ok: false, error: "deadline.feedbackDueDateMcf must be a valid date string" };

  if (taskOpenDate >= taskDueDate) {
    return { ok: false, error: "deadline.taskOpenDate must be before deadline.taskDueDate" };
  }
  if (taskDueDate > assessmentOpenDate) {
    return { ok: false, error: "deadline.assessmentOpenDate must be on or after deadline.taskDueDate" };
  }
  if (assessmentOpenDate >= assessmentDueDate) {
    return { ok: false, error: "deadline.assessmentOpenDate must be before deadline.assessmentDueDate" };
  }
  if (assessmentDueDate > feedbackOpenDate) {
    return { ok: false, error: "deadline.feedbackOpenDate must be on or after deadline.assessmentDueDate" };
  }
  if (feedbackOpenDate >= feedbackDueDate) {
    return { ok: false, error: "deadline.feedbackOpenDate must be before deadline.feedbackDueDate" };
  }
  if (taskDueDateMcf < taskDueDate) {
    return { ok: false, error: "deadline.taskDueDateMcf must be on or after deadline.taskDueDate" };
  }
  if (assessmentDueDateMcf < assessmentDueDate) {
    return { ok: false, error: "deadline.assessmentDueDateMcf must be on or after deadline.assessmentDueDate" };
  }
  if (feedbackDueDateMcf < feedbackDueDate) {
    return { ok: false, error: "deadline.feedbackDueDateMcf must be on or after deadline.feedbackDueDate" };
  }

  return {
    ok: true,
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
    },
  };
}
