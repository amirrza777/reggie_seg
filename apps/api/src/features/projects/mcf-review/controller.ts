import type { Request, Response } from "express";
import {
  fetchTeamDeadlineForStaff,
  reviewTeamMcfRequestForStaff,
  resolveTeamMcfRequestWithDeadlineOverrideForStaff,
  type McfReviewStatus,
} from "./service.js";

type DateField =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

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

export async function reviewStaffTeamMcfRequestHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const requestId = Number(req.params.requestId);
  const userId = Number((req.body as { userId?: unknown }).userId);
  const status = (req.body as { status?: unknown }).status;

  if (Number.isNaN(projectId) || Number.isNaN(teamId) || Number.isNaN(requestId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, team ID, or request ID" });
  }

  if (status !== "REJECTED" && status !== "IN_REVIEW") {
    return res.status(400).json({ error: "status must be REJECTED or IN_REVIEW" });
  }

  try {
    const request = await reviewTeamMcfRequestForStaff(
      userId,
      projectId,
      teamId,
      requestId,
      status as McfReviewStatus
    );
    if (!request) {
      return res.status(404).json({ error: "Project, team, or request not found for staff scope" });
    }
    return res.json({ request });
  } catch (error) {
    console.error("Error reviewing MCF request:", error);
    return res.status(500).json({ error: "Failed to review MCF request" });
  }
}

export async function resolveStaffTeamMcfRequestHandler(req: Request, res: Response) {
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

  try {
    const result = await resolveTeamMcfRequestWithDeadlineOverrideForStaff(userId, projectId, teamId, requestId, {
      taskOpenDate: taskOpenDateParsed.value,
      taskDueDate: taskDueDateParsed.value,
      assessmentOpenDate: assessmentOpenDateParsed.value,
      assessmentDueDate: assessmentDueDateParsed.value,
      feedbackOpenDate: feedbackOpenDateParsed.value,
      feedbackDueDate: feedbackDueDateParsed.value,
    });

    if (!result) {
      return res.status(404).json({ error: "Project, team, request, or deadline not found for staff scope" });
    }
    return res.json(result);
  } catch (error) {
    console.error("Error resolving MCF request with deadline override:", error);
    return res.status(500).json({ error: "Failed to resolve MCF request" });
  }
}
