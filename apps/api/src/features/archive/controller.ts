import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
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
  isStaffOrAdmin,
} from "./service.js";

/** Handles requests for list modules. */
export async function listModulesHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const modules = await getModules();
  res.json(modules);
}

/** Handles requests for list projects. */
export async function listProjectsHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const projects = await getProjects();
  res.json(projects);
}

/** Handles requests for list teams. */
export async function listTeamsHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const teams = await getTeams();
  res.json(teams);
}

/** Handles requests for archive module. */
export async function archiveModuleHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await archiveModule(id);
  res.json(result);
}

/** Handles requests for unarchive module. */
export async function unarchiveModuleHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await unarchiveModule(id);
  res.json(result);
}

/** Handles requests for archive project. */
export async function archiveProjectHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await archiveProject(id);
  res.json(result);
}

/** Handles requests for unarchive project. */
export async function unarchiveProjectHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await unarchiveProject(id);
  res.json(result);
}

/** Handles requests for archive team. */
export async function archiveTeamHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await archiveTeam(id);
  res.json(result);
}

/** Handles requests for unarchive team. */
export async function unarchiveTeamHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const result = await unarchiveTeam(id);
  res.json(result);
}
