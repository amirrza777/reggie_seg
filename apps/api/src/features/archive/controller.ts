import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { prisma } from "../../shared/db.js";
import {
  getModules,
  getProjects,
  getTeams,
  archiveModule,
  unarchiveModule,
  archiveProject,
  unarchiveProject,
  archiveTeam,
  unarchiveTeam,
} from "./service.js";

async function isStaffOrAdmin(req: AuthRequest): Promise<boolean> {
  const userId = req.user?.sub;
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const role = user?.role;
  return role === "STAFF" || role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

export async function listModulesHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const modules = await getModules();
  res.json(modules);
}

export async function listProjectsHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const projects = await getProjects();
  res.json(projects);
}

export async function listTeamsHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const teams = await getTeams();
  res.json(teams);
}

export async function archiveModuleHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await archiveModule(id);
  res.json(result);
}

export async function unarchiveModuleHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await unarchiveModule(id);
  res.json(result);
}

export async function archiveProjectHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await archiveProject(id);
  res.json(result);
}

export async function unarchiveProjectHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await unarchiveProject(id);
  res.json(result);
}

export async function archiveTeamHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await archiveTeam(id);
  res.json(result);
}

export async function unarchiveTeamHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await unarchiveTeam(id);
  res.json(result);
}
