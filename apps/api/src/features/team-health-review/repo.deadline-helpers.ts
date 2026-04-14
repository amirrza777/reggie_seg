export type DeadlineSnapshot = {
  taskOpenDate: Date | null;
  taskDueDate: Date | null;
  taskDueDateMcf: Date | null;
  assessmentOpenDate: Date | null;
  assessmentDueDate: Date | null;
  assessmentDueDateMcf: Date | null;
  feedbackOpenDate: Date | null;
  feedbackDueDate: Date | null;
  feedbackDueDateMcf: Date | null;
  isOverridden: boolean;
};

export type DeadlineFieldKey =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

export type DeadlineInputMode = "SHIFT_DAYS" | "SELECT_DATE";

type DeadlineOverrideMetadata = {
  inputMode: DeadlineInputMode;
  shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
};

export function parseDeadlineOverrideMetadata(
  reason: string | null | undefined,
): DeadlineOverrideMetadata | null {
  if (!reason) return null;
  try {
    const parsed = JSON.parse(reason) as {
      inputMode?: unknown;
      shiftDays?: unknown;
    };
    if (parsed.inputMode !== "SHIFT_DAYS" && parsed.inputMode !== "SELECT_DATE") {
      return null;
    }

    const shiftDays: Partial<Record<DeadlineFieldKey, number>> = {};
    if (parsed.shiftDays && typeof parsed.shiftDays === "object" && !Array.isArray(parsed.shiftDays)) {
      const candidate = parsed.shiftDays as Record<string, unknown>;
      const fields: DeadlineFieldKey[] = [
        "taskOpenDate",
        "taskDueDate",
        "assessmentOpenDate",
        "assessmentDueDate",
        "feedbackOpenDate",
        "feedbackDueDate",
      ];

      for (const field of fields) {
        const value = candidate[field];
        if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
          shiftDays[field] = value;
        }
      }
    }

    return {
      inputMode: parsed.inputMode,
      ...(Object.keys(shiftDays).length > 0 ? { shiftDays } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeDeadlineOverrideMetadata(
  metadata?:
    | {
        inputMode?: DeadlineInputMode;
        shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
      }
    | null,
) {
  if (!metadata?.inputMode) return undefined;

  const payload: DeadlineOverrideMetadata = {
    inputMode: metadata.inputMode,
  };

  if (metadata.inputMode === "SHIFT_DAYS" && metadata.shiftDays) {
    const sanitized: Partial<Record<DeadlineFieldKey, number>> = {};
    const fields: DeadlineFieldKey[] = [
      "taskOpenDate",
      "taskDueDate",
      "assessmentOpenDate",
      "assessmentDueDate",
      "feedbackOpenDate",
      "feedbackDueDate",
    ];

    for (const field of fields) {
      const value = metadata.shiftDays[field];
      if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
        sanitized[field] = value;
      }
    }
    if (Object.keys(sanitized).length > 0) {
      payload.shiftDays = sanitized;
    }
  }

  return JSON.stringify(payload);
}

export function mergeDeadlinesForTeam(
  projectDeadline: {
    taskOpenDate: Date;
    taskDueDate: Date;
    taskDueDateMcf?: Date | null;
    assessmentOpenDate: Date;
    assessmentDueDate: Date;
    assessmentDueDateMcf?: Date | null;
    feedbackOpenDate: Date;
    feedbackDueDate: Date;
    feedbackDueDateMcf?: Date | null;
  } | null,
  teamOverride: {
    taskOpenDate: Date | null;
    taskDueDate: Date | null;
    assessmentOpenDate: Date | null;
    assessmentDueDate: Date | null;
    feedbackOpenDate: Date | null;
    feedbackDueDate: Date | null;
  } | null,
): DeadlineSnapshot | null {
  if (!projectDeadline) return null;
  return {
    taskOpenDate: teamOverride?.taskOpenDate ?? projectDeadline.taskOpenDate,
    taskDueDate: teamOverride?.taskDueDate ?? projectDeadline.taskDueDate,
    taskDueDateMcf: projectDeadline.taskDueDateMcf ?? null,
    assessmentOpenDate: teamOverride?.assessmentOpenDate ?? projectDeadline.assessmentOpenDate,
    assessmentDueDate: teamOverride?.assessmentDueDate ?? projectDeadline.assessmentDueDate,
    assessmentDueDateMcf: projectDeadline.assessmentDueDateMcf ?? null,
    feedbackOpenDate: teamOverride?.feedbackOpenDate ?? projectDeadline.feedbackOpenDate,
    feedbackDueDate: teamOverride?.feedbackDueDate ?? projectDeadline.feedbackDueDate,
    feedbackDueDateMcf: projectDeadline.feedbackDueDateMcf ?? null,
    isOverridden: Boolean(teamOverride),
  };
}

export const PROJECT_DEADLINE_MERGE_SELECT = {
  taskOpenDate: true,
  taskDueDate: true,
  taskDueDateMcf: true,
  assessmentOpenDate: true,
  assessmentDueDate: true,
  assessmentDueDateMcf: true,
  feedbackOpenDate: true,
  feedbackDueDate: true,
  feedbackDueDateMcf: true,
} as const;
