import type { Request, Response } from "express";
import {
  fetchMyTeamHealthMessages,
  fetchTeamHealthMessagesForStaff,
  submitTeamHealthMessage,
} from "./service.js";
import {
  parseProjectAndUserQuery,
  parseProjectIdParam,
  parseProjectTeamAndUserQuery,
  parseTeamHealthMessageBody,
} from "./controller.parsers.js";

export async function createTeamHealthMessageHandler(req: Request, res: Response) {
  const projectId = parseProjectIdParam(req.params.projectId);
  const parsedBody = parseTeamHealthMessageBody(req.body);
  if (!projectId.ok || !parsedBody.ok) {
    const error = projectId.ok ? parsedBody.error : "Invalid user ID or project ID";
    return res.status(400).json({ error });
  }

  try {
    const request = await submitTeamHealthMessage(
      parsedBody.value.userId,
      projectId.value,
      parsedBody.value.subject,
      parsedBody.value.details,
    );
    if (!request) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    return res.status(201).json({ request });
  } catch (error) {
    console.error("Error creating team health message:", error);
    return res.status(500).json({ error: "Failed to create team health message" });
  }
}

export async function getMyTeamHealthMessagesHandler(req: Request, res: Response) {
  const parsed = parseProjectAndUserQuery(req as any);
  if (!parsed.ok) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const requests = await fetchMyTeamHealthMessages(parsed.value.userId, parsed.value.projectId);
    if (!requests) {
      return res.status(404).json({ error: "Team not found for user in this project" });
    }
    return res.json({ requests });
  } catch (error) {
    console.error("Error fetching user team health messages:", error);
    return res.status(500).json({ error: "Failed to fetch team health messages" });
  }
}

export async function getStaffTeamHealthMessagesHandler(req: Request, res: Response) {
  const parsed = parseProjectTeamAndUserQuery(req as any);
  if (!parsed.ok) {
    return res.status(400).json({ error: "Invalid user ID, project ID, or team ID" });
  }

  try {
    const requests = await fetchTeamHealthMessagesForStaff(parsed.value.userId, parsed.value.projectId, parsed.value.teamId);
    if (!requests) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ requests });
  } catch (error) {
    console.error("Error fetching staff team team health messages:", error);
    return res.status(500).json({ error: "Failed to fetch team team health messages" });
  }
}
