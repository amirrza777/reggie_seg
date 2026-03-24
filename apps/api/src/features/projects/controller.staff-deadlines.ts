import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  clearStaffStudentDeadlineOverride,
  fetchStaffStudentDeadlineOverrides,
  updateTeamDeadlineProfileForStaff,
  upsertStaffStudentDeadlineOverride,
} from "./service.js";
import { parseStudentDeadlineOverridePayload } from "./controller.deadline-parsers.js";
import {
  parseAuthenticatedUserId,
  parseDeadlineProfileBody,
  parseProjectIdParam,
  parseStaffStudentOverrideRoute,
  parseTeamIdParam,
} from "./controller.parsers.js";

export async function updateTeamDeadlineProfileHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return res.status(401).json({ error: actorUserId.error });
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });
  const deadlineProfile = parseDeadlineProfileBody(req.body);
  if (!deadlineProfile.ok) return res.status(400).json({ error: deadlineProfile.error });

  try {
    const updated = await updateTeamDeadlineProfileForStaff(actorUserId.value, teamId.value, deadlineProfile.value);
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error updating team deadline profile:", error);
    return res.status(500).json({ error: "Failed to update team deadline profile" });
  }
}

export async function getStaffStudentDeadlineOverridesHandler(req: AuthRequest, res: Response) {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return res.status(401).json({ error: actorUserId.error });
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!projectId.ok) return res.status(400).json({ error: projectId.error });

  try {
    const overrides = await fetchStaffStudentDeadlineOverrides(actorUserId.value, projectId.value);
    return res.json({ overrides });
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error fetching staff student deadline overrides:", error);
    return res.status(500).json({ error: "Failed to fetch student deadline overrides" });
  }
}

export async function upsertStaffStudentDeadlineOverrideHandler(req: AuthRequest, res: Response) {
  const parsedRoute = parseStaffStudentOverrideRoute(req);
  if (!parsedRoute.ok) {
    const status = parsedRoute.error === "Unauthorized" ? 401 : 400;
    return res.status(status).json({ error: parsedRoute.error });
  }

  const parsed = parseStudentDeadlineOverridePayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const hasAnyField =
    parsed.value.taskOpenDate !== undefined ||
    parsed.value.taskDueDate !== undefined ||
    parsed.value.assessmentOpenDate !== undefined ||
    parsed.value.assessmentDueDate !== undefined ||
    parsed.value.feedbackOpenDate !== undefined ||
    parsed.value.feedbackDueDate !== undefined ||
    parsed.value.reason !== undefined;
  if (!hasAnyField) {
    return res.status(400).json({ error: "At least one override field is required" });
  }

  try {
    const override = await upsertStaffStudentDeadlineOverride(
      parsedRoute.value.actorUserId,
      parsedRoute.value.projectId,
      parsedRoute.value.studentId,
      parsed.value,
    );
    return res.json({ override });
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "STUDENT_NOT_IN_PROJECT") {
      return res.status(404).json({ error: "Student not found in project" });
    }
    console.error("Error upserting student deadline override:", error);
    return res.status(500).json({ error: "Failed to update student deadline override" });
  }
}

export async function clearStaffStudentDeadlineOverrideHandler(req: AuthRequest, res: Response) {
  const parsedRoute = parseStaffStudentOverrideRoute(req);
  if (!parsedRoute.ok) {
    const status = parsedRoute.error === "Unauthorized" ? 401 : 400;
    return res.status(status).json({ error: parsedRoute.error });
  }

  try {
    const result = await clearStaffStudentDeadlineOverride(
      parsedRoute.value.actorUserId,
      parsedRoute.value.projectId,
      parsedRoute.value.studentId,
    );
    return res.json(result);
  } catch (error: any) {
    if (error?.code === "FORBIDDEN") {
      return res.status(403).json({ error: error.message || "Forbidden" });
    }
    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error clearing student deadline override:", error);
    return res.status(500).json({ error: "Failed to clear student deadline override" });
  }
}
