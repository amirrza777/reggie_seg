import type { Request, Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parsePositiveInt } from "../../shared/parse.js";
import { addUserToTeam, createTeam, createTeamForProject, getTeamById, getTeamMembers } from "./service.js";
import {
  parseAddUserToTeamBody,
  parseCreateTeamForProjectBody,
  parseTeamIdParam,
} from "./controller.parsers.js";

/** Handles requests for create team. */
export async function createTeamHandler(req: Request, res: Response) {
  const userId = parsePositiveInt(req.body?.userId, "userId");
  const teamData = req.body?.teamData;

  if (!userId.ok || !teamData) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeam(userId.value, teamData);
    return res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for create team for project. */
export async function createTeamForProjectHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  const parsedBody = parseCreateTeamForProjectBody(req.body);
  if (!userId || !parsedBody.ok) return res.status(400).json({ error: "Invalid request body" });

  try {
    const team = await createTeamForProject(userId, parsedBody.value.projectId, parsedBody.value.teamName);
    return res.status(201).json(team);
  } catch (error: any) {
    if (error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    if (error?.code === "TEAM_CREATION_FORBIDDEN") {
      return res.status(403).json({ error: "Team creation is disabled for this project" });
    }
    console.error("Error creating team for project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get team by ID. */
export async function getTeamByIdHandler(req: Request, res: Response) {
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });

  try {
    const team = await getTeamById(teamId.value);
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
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });
  const parsedBody = parseAddUserToTeamBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const allocation = await addUserToTeam(teamId.value, parsedBody.value.userId, parsedBody.value.role);
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
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });

  try {
    const members = await getTeamMembers(teamId.value);
    return res.json(members);
  } catch (error: any) {
    if (error?.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error fetching team members:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
