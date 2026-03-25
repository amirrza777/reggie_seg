import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { addUserToTeam, createTeam, createTeamForProject, getTeamById, getTeamMembers } from "./service.js";

/** Handles requests for create team. */
export async function createTeamHandler(req: Request, res: Response) {
  const userId = Number(req.body?.userId);
  const teamData = req.body?.teamData;

  if (isNaN(userId) || !teamData) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeam(userId, teamData);
    return res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for create team for project. */
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
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error creating team for project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get team by ID. */
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

/** Handles requests for add user to team. */
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

/** Handles requests for get team members. */
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
