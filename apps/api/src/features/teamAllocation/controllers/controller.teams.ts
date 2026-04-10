import type { Request, Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import {
  addUserToTeam,
  createTeam,
  createTeamForProject,
  getTeamById,
  getTeamMembers,
} from "../service/service.js";
import {
  parseAddUserToTeamBody,
  parseCreateTeamForProjectBody,
  parseStaffActor,
  parseTeamIdParam,
} from "./controller.parsers.js";

export async function createTeamHandler(req: AuthRequest, res: Response) {
  const userId = parseStaffActor(req);
  const teamData = req.body?.teamData;

  if (!userId.ok) return res.status(401).json({ error: userId.error });
  if (!teamData) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const team = await createTeam(userId.value, teamData);
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
  const userId = parseStaffActor(req);
  if (!userId.ok) return res.status(401).json({ error: userId.error });
  const parsedBody = parseCreateTeamForProjectBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const team = await createTeamForProject(userId.value, parsedBody.value.projectId, parsedBody.value.teamName);
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