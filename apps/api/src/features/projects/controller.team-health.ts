import type { Request, Response } from "express";
import {
  fetchMyTeamHealthMessages,
  fetchTeamHealthMessagesForStaff,
  submitTeamHealthMessage,
} from "./service.js";

export async function createTeamHealthMessageHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  const userId = Number((req.body as { userId?: unknown }).userId);
  const subjectRaw = (req.body as { subject?: unknown }).subject;
  const detailsRaw = (req.body as { details?: unknown }).details;

  if (Number.isNaN(projectId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  if (typeof subjectRaw !== "string" || typeof detailsRaw !== "string") {
    return res.status(400).json({ error: "subject and details are required strings" });
  }

  const subject = subjectRaw.trim();
  const details = detailsRaw.trim();
  if (!subject || !details) {
    return res.status(400).json({ error: "subject and details cannot be empty" });
  }

  try {
    const request = await submitTeamHealthMessage(userId, projectId, subject, details);
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
  const projectId = Number(req.params.projectId);
  const userId = Number(req.query.userId);

  if (Number.isNaN(projectId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const requests = await fetchMyTeamHealthMessages(userId, projectId);
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
  const projectId = Number(req.params.projectId);
  const teamId = Number(req.params.teamId);
  const userId = Number(req.query.userId);

  if (Number.isNaN(projectId) || Number.isNaN(teamId) || Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID, project ID, or team ID" });
  }

  try {
    const requests = await fetchTeamHealthMessagesForStaff(userId, projectId, teamId);
    if (!requests) {
      return res.status(404).json({ error: "Project or team not found for staff scope" });
    }
    return res.json({ requests });
  } catch (error) {
    console.error("Error fetching staff team team health messages:", error);
    return res.status(500).json({ error: "Failed to fetch team team health messages" });
  }
}
