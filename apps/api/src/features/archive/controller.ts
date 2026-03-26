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
import { parseArchiveEntityId } from "./controller.parsers.js";

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
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await archiveModule(id.value);
  res.json(result);
}

/** Handles requests for unarchive module. */
export async function unarchiveModuleHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await unarchiveModule(id.value);
  res.json(result);
}

/** Handles requests for archive project. */
export async function archiveProjectHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await archiveProject(id.value);
  res.json(result);
}

/** Handles requests for unarchive project. */
export async function unarchiveProjectHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await unarchiveProject(id.value);
  res.json(result);
}

/** Handles requests for archive team. */
export async function archiveTeamHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await archiveTeam(id.value);
  res.json(result);
}

/** Handles requests for unarchive team. */
export async function unarchiveTeamHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await unarchiveTeam(id.value);
  res.json(result);
}
