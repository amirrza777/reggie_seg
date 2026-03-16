import type { Request, Response } from "express";
import {
  fetchTeamDeadlineForStaff,
  InvalidDeadlineOverrideError,
  ResolvedTeamHealthMessageAlreadyExistsError,
  reviewTeamHealthMessageForStaff,
  resolveTeamHealthMessageWithDeadlineOverrideForStaff,
} from "./service.js";

type DateField =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

const deadlineFields: DateField[] = [
  "taskOpenDate",
  "taskDueDate",
  "assessmentOpenDate",
  "assessmentDueDate",
  "feedbackOpenDate",
  "feedbackDueDate",
];

function parseDateField(value: unknown, fieldName: DateField) {
  if (value === undefined) return { ok: true as const, value: undefined };
  if (value === null || value === "") return { ok: true as const, value: null };
  if (typeof value !== "string") {
    return { ok: false as const, error: `${fieldName} must be an ISO date string, null, or omitted` };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false as const, error: `${fieldName} must be a valid ISO date string` };
  }

  return { ok: true as const, value: parsed };
}

export async function getStaffTeamDeadlineHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const userId = Number(req.query.userId);

  if (Number.isNaN(projectId) || Number.isNaN(teamId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, or team ID" });
  }

  try {
    const deadline = await fetchTeamDeadlineForStaff(userId, projectId, teamId);
    if (!deadline) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ deadline });
  } catch (error) {
    console.error("Error fetching staff team deadline:", error);
    return res.status(500).json({ error: "Failed to fetch team deadline" });
  }
}

export async function reviewStaffTeamHealthMessageHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const requestId = Number(req.params.requestId);
  const userId = Number((req.body as { userId?: unknown }).userId);
  const resolvedRaw = (req.body as { resolved?: unknown }).resolved;
  const responseTextRaw = (req.body as { responseText?: unknown }).responseText;

  if (Number.isNaN(projectId) || Number.isNaN(teamId) || Number.isNaN(requestId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, team ID, or request ID" });
  }

  if (typeof resolvedRaw !== "boolean") {
    return res.status(400).json({ error: "resolved must be a boolean" });
  }
  const resolved = resolvedRaw;

  if (responseTextRaw !== undefined && typeof responseTextRaw !== "string") {
    return res.status(400).json({ error: "responseText must be a string when provided" });
  }
  const responseText = typeof responseTextRaw === "string" ? responseTextRaw.trim() : undefined;
  if (resolved && !responseText) {
    return res.status(400).json({ error: "responseText is required when resolving a request" });
  }

  try {
    const request = await reviewTeamHealthMessageForStaff(
      userId,
      projectId,
      teamId,
      requestId,
      resolved,
      responseText
    );
    if (!request) {
      return res.status(404).json({ error: "Project, team, or request not found for staff scope" });
    }
    return res.json({ request });
  } catch (error) {
    console.error("Error reviewing team health message:", error);
    return res.status(500).json({ error: "Failed to review team health message" });
  }
}

export async function resolveStaffTeamHealthMessageHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const requestId = Number(req.params.requestId);
  const userId = Number((req.body as { userId?: unknown }).userId);

  if (Number.isNaN(projectId) || Number.isNaN(teamId) || Number.isNaN(requestId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, team ID, or request ID" });
  }

  const taskOpenDateParsed = parseDateField((req.body as { taskOpenDate?: unknown }).taskOpenDate, "taskOpenDate");
  if (!taskOpenDateParsed.ok) return res.status(400).json({ error: taskOpenDateParsed.error });

  const taskDueDateParsed = parseDateField((req.body as { taskDueDate?: unknown }).taskDueDate, "taskDueDate");
  if (!taskDueDateParsed.ok) return res.status(400).json({ error: taskDueDateParsed.error });

  const assessmentOpenDateParsed = parseDateField(
    (req.body as { assessmentOpenDate?: unknown }).assessmentOpenDate,
    "assessmentOpenDate"
  );
  if (!assessmentOpenDateParsed.ok) return res.status(400).json({ error: assessmentOpenDateParsed.error });

  const assessmentDueDateParsed = parseDateField(
    (req.body as { assessmentDueDate?: unknown }).assessmentDueDate,
    "assessmentDueDate"
  );
  if (!assessmentDueDateParsed.ok) return res.status(400).json({ error: assessmentDueDateParsed.error });

  const feedbackOpenDateParsed = parseDateField(
    (req.body as { feedbackOpenDate?: unknown }).feedbackOpenDate,
    "feedbackOpenDate"
  );
  if (!feedbackOpenDateParsed.ok) return res.status(400).json({ error: feedbackOpenDateParsed.error });

  const feedbackDueDateParsed = parseDateField(
    (req.body as { feedbackDueDate?: unknown }).feedbackDueDate,
    "feedbackDueDate"
  );
  if (!feedbackDueDateParsed.ok) return res.status(400).json({ error: feedbackDueDateParsed.error });

  const deadlineInputModeRaw = (req.body as { deadlineInputMode?: unknown }).deadlineInputMode;
  const deadlineInputMode =
    deadlineInputModeRaw === "SHIFT_DAYS" || deadlineInputModeRaw === "SELECT_DATE"
      ? deadlineInputModeRaw
      : undefined;
  if (deadlineInputModeRaw !== undefined && deadlineInputMode === undefined) {
    return res.status(400).json({ error: "deadlineInputMode must be SHIFT_DAYS or SELECT_DATE when provided" });
  }

  const shiftDaysRaw = (req.body as { shiftDays?: unknown }).shiftDays;
  let shiftDays: Partial<Record<DateField, number>> | undefined;
  if (shiftDaysRaw !== undefined) {
    if (!shiftDaysRaw || typeof shiftDaysRaw !== "object" || Array.isArray(shiftDaysRaw)) {
      return res.status(400).json({ error: "shiftDays must be an object when provided" });
    }
    shiftDays = {};
    const candidate = shiftDaysRaw as Record<string, unknown>;
    for (const field of deadlineFields) {
      const value = candidate[field];
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        return res.status(400).json({ error: `${field} shift must be a whole number of 0 or greater` });
      }
      shiftDays[field] = value;
    }
  }

  try {
    const result = await resolveTeamHealthMessageWithDeadlineOverrideForStaff(userId, projectId, teamId, requestId, {
      taskOpenDate: taskOpenDateParsed.value,
      taskDueDate: taskDueDateParsed.value,
      assessmentOpenDate: assessmentOpenDateParsed.value,
      assessmentDueDate: assessmentDueDateParsed.value,
      feedbackOpenDate: feedbackOpenDateParsed.value,
      feedbackDueDate: feedbackDueDateParsed.value,
    }, {
      inputMode: deadlineInputMode,
      shiftDays,
    });

    if (!result) {
      return res.status(404).json({ error: "Project, team, request, or deadline not found for staff scope" });
    }
    return res.json(result);
  } catch (error) {
    if (error instanceof InvalidDeadlineOverrideError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof ResolvedTeamHealthMessageAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Error resolving team health message with deadline override:", error);
    return res.status(500).json({ error: "Failed to resolve team health message" });
  }
}
