import type { Response } from "express";
import type { AuthRequest } from "../../../auth/middleware.js";
import { sendProjectOrModuleArchivedConflict } from "../../../shared/projectWriteGuard.js";
import { parsePositiveInt, resolveAuthenticatedUserId } from "../controller.shared.js";
import {
  deleteStaffProjectManage,
  getStaffProjectManageSummary,
  patchStaffProjectManage,
} from "./repo.js";

function parseArchived(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return undefined;
  return value;
}

export async function getStaffProjectManageHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const row = await getStaffProjectManageSummary(actorUserId, projectId);
    if (!row) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({
      id: row.id,
      name: row.name,
      archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
      moduleId: row.moduleId,
      moduleArchivedAt: row.module.archivedAt ? new Date(row.module.archivedAt).toISOString() : null,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message ?? "Forbidden" });
    }
    if (err?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error fetching staff project manage summary:", error);
    return res.status(500).json({ error: "Failed to load project settings" });
  }
}

export async function patchStaffProjectManageHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);
  const nameRaw = req.body?.name;
  const archived = parseArchived(req.body?.archived);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  const hasName = nameRaw !== undefined;
  if (hasName && typeof nameRaw !== "string") {
    return res.status(400).json({ error: "name must be a string" });
  }
  const hasArchived = archived !== undefined;
  if (req.body?.archived !== undefined && !hasArchived) {
    return res.status(400).json({ error: "archived must be a boolean" });
  }

  if (!hasName && !hasArchived) {
    return res.status(400).json({ error: "Provide name and/or archived" });
  }

  try {
    const updated = await patchStaffProjectManage(actorUserId, projectId, {
      ...(hasName ? { name: nameRaw as string } : {}),
      ...(hasArchived ? { archived: archived as boolean } : {}),
    });
    return res.json({
      id: updated.id,
      name: updated.name,
      archivedAt: updated.archivedAt ? new Date(updated.archivedAt).toISOString() : null,
      moduleId: updated.moduleId,
      moduleArchivedAt: updated.module.archivedAt
        ? new Date(updated.module.archivedAt).toISOString()
        : null,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message ?? "Forbidden" });
    }
    if (err?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err?.code === "INVALID_NAME") {
      return res.status(400).json({ error: err.message ?? "Invalid project name" });
    }
    if (err?.code === "MODULE_ARCHIVED") {
      return res.status(409).json({ error: err.message ?? "Module is archived" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error updating staff project settings:", error);
    return res.status(500).json({ error: "Failed to update project settings" });
  }
}

export async function deleteStaffProjectManageHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  const projectId = parsePositiveInt(req.params.projectId);

  if (actorUserId === null) {
    return;
  }
  if (!projectId) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const { moduleId } = await deleteStaffProjectManage(actorUserId, projectId);
    return res.json({ moduleId });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "FORBIDDEN") {
      return res.status(403).json({ error: err.message ?? "Forbidden" });
    }
    if (err?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Error deleting staff project:", error);
    return res.status(500).json({ error: "Failed to delete project" });
  }
}
