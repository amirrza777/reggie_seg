import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import {
  getModules,
  getProjects,
  archiveModule,
  unarchiveModule,
  archiveProject,
  unarchiveProject,
  isStaffOrAdmin,
} from "./service.js";
import { parseArchiveEntityId } from "./controller.parsers.js";

/** Handles requests for list modules. */
export async function listModulesHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isStaffOrAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  const modules = await getModules(userId);
  res.json(modules);
}

/** Handles requests for list projects. */
export async function listProjectsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isStaffOrAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  const projects = await getProjects(userId);
  res.json(projects);
}

/** Handles requests for archive module. */
export async function archiveModuleHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isStaffOrAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await archiveModule(userId, id.value);
  if (!result) return res.status(404).json({ error: "Module not found" });
  res.json(result);
}

/** Handles requests for unarchive module. */
export async function unarchiveModuleHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isStaffOrAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await unarchiveModule(userId, id.value);
  if (!result) return res.status(404).json({ error: "Module not found" });
  res.json(result);
}

/** Handles requests for archive project. */
export async function archiveProjectHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isStaffOrAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await archiveProject(userId, id.value);
  if (!result) return res.status(404).json({ error: "Project not found" });
  res.json(result);
}

/** Handles requests for unarchive project. */
export async function unarchiveProjectHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isStaffOrAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  const id = parseArchiveEntityId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const result = await unarchiveProject(userId, id.value);
  if (!result) return res.status(404).json({ error: "Project not found" });
  res.json(result);
}
