import type { Request, Response } from "express";
import {
  fetchTeamDeadlineForStaff,
  InvalidDeadlineOverrideError,
  ResolvedTeamHealthMessageAlreadyExistsError,
  reviewTeamHealthMessageForStaff,
  resolveTeamHealthMessageWithDeadlineOverrideForStaff,
} from "./service.js";
import {
  parseProjectTeamAndUserQuery,
  parseProjectTeamRequestAndUserBody,
  parseTeamHealthResolveBody,
  parseTeamHealthReviewBody,
} from "../projects/controller.parsers.js";

export async function getStaffTeamDeadlineHandler(req: Request, res: Response) {
  const parsed = parseProjectTeamAndUserQuery(req as any);
  if (!parsed.ok) {
    return res.status(400).json({ error: "Invalid user ID, project ID, or team ID" });
  }

  try {
    const deadline = await fetchTeamDeadlineForStaff(parsed.value.userId, parsed.value.projectId, parsed.value.teamId);
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
  const parsedRoute = parseProjectTeamRequestAndUserBody(req as any);
  if (!parsedRoute.ok) {
    return res.status(400).json({ error: "Invalid user ID, project ID, team ID, or request ID" });
  }
  const parsedBody = parseTeamHealthReviewBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const request = await reviewTeamHealthMessageForStaff(
      parsedRoute.value.userId,
      parsedRoute.value.projectId,
      parsedRoute.value.teamId,
      parsedRoute.value.requestId,
      parsedBody.value.resolved,
      parsedBody.value.responseText,
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
  const parsedRoute = parseProjectTeamRequestAndUserBody(req as any);
  if (!parsedRoute.ok) {
    return res.status(400).json({ error: "Invalid user ID, project ID, team ID, or request ID" });
  }
  const parsedBody = parseTeamHealthResolveBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await resolveTeamHealthMessageWithDeadlineOverrideForStaff(
      parsedRoute.value.userId,
      parsedRoute.value.projectId,
      parsedRoute.value.teamId,
      parsedRoute.value.requestId,
      parsedBody.value.deadlineOverrides,
      parsedBody.value.options,
    );

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
