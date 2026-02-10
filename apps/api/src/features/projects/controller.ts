import type { Request, Response } from "express"
import { createProject, fetchProjectById, fetchProjectsForUser , fetchProjectDeadline, fetchTeammatesForProject} from "./service.js"

export async function createProjectHandler(req: Request, res: Response) {
  const { name, moduleId, questionnaireTemplateId, teamIds } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Project name is required and must be a string" });
  }

  if (typeof moduleId !== "number" || typeof questionnaireTemplateId !== "number") {
    return res.status(400).json({ error: "moduleId and questionnaireTemplateId must be numbers" });
  }

  if (!Array.isArray(teamIds) || !teamIds.every((id) => typeof id === "number")) {
    return res.status(400).json({ error: "teamIds must be an array of numbers" });
  }

  try {
    const project = await createProject(name, moduleId, questionnaireTemplateId, teamIds);
    res.status(201).json(project);
  } catch   (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }         
}

export async function getProjectByIdHandler(req: Request, res: Response) {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
}

export async function getUserProjectsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const projects = await fetchProjectsForUser(userId);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}               

export async function getProjectDeadlineHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);
  
  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const deadline = await fetchProjectDeadline(userId, projectId);
    res.json({ deadline });
  } catch (error) {
    console.error("Error fetching project deadline:", error);
    res.status(500).json({ error: "Failed to fetch project deadline" });
  }
}

export async function getTeammatesForProjectHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  const projectId = Number(req.params.projectId);

  if (isNaN(userId) || isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid user ID or project ID" });
  }

  try {
    const teammates = await fetchTeammatesForProject(userId, projectId);
    res.json({ teammates });
  } catch (error) {
    console.error("Error fetching teammates for project:", error);
    res.status(500).json({ error: "Failed to fetch teammates" });
  }
} 