import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  addUserToTeam,
  createTeam,
  createTeamForProject,
  getTeamById,
  getTeamMembers,
} from "./service.js";

export async function createTeamHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  const teamData = req.body?.teamData;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!teamData) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeam(userId, teamData);
    return res.status(201).json(team);
  } catch (error: any) {
    if (error?.code === "TEAM_CREATION_FORBIDDEN") {
      return res.status(403).json({ error: "Only students can create teams from this workspace" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "STUDENT_ALREADY_IN_TEAM") {
      return res.status(409).json({ error: "You are already assigned to a team in this project" });
    }
    if (error?.code === "INVALID_PROJECT_ID") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    if (error?.code === "INVALID_TEAM_NAME") {
      return res.status(400).json({ error: "teamName is required" });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Team name already exists in this enterprise" });
    }
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error creating team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTeamForProjectHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  const projectId = Number(req.body?.projectId);
  const teamName = typeof req.body?.teamName === "string" ? req.body.teamName.trim() : "";

  if (!userId || isNaN(projectId) || !teamName) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeamForProject(userId, projectId, teamName);
    return res.status(201).json(team);
  } catch (error: any) {
    if (error?.code === "TEAM_CREATION_FORBIDDEN") {
      return res.status(403).json({ error: "Only students can create teams from this workspace" });
    }
    if (error?.code === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error?.code === "STUDENT_ALREADY_IN_TEAM") {
      return res.status(409).json({ error: "You are already assigned to a team in this project" });
    }
    if (error?.code === "INVALID_TEAM_NAME") {
      return res.status(400).json({ error: "teamName is required" });
    }
    if (error?.code === "TEAM_NAME_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Team name already exists in this enterprise" });
    }
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error creating team for project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTeamByIdHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const team = await getTeamById(teamId);
    return res.json(team);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error fetching team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function addUserToTeamHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  const userId = Number(req.body?.userId);
  const role = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : "MEMBER";

  if (isNaN(teamId) || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const allocation = await addUserToTeam(teamId, userId, role === "OWNER" ? "OWNER" : "MEMBER");
    return res.status(201).json(allocation);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    if (error?.code === "MEMBER_ALREADY_EXISTS") {
      return res.status(409).json({ error: "User already in team" });
    }
    console.error("Error adding user to team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTeamMembersHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const members = await getTeamMembers(teamId);
    return res.json(members);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error fetching team members:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}