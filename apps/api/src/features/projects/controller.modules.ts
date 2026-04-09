import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  fetchModuleStaffList,
  fetchModuleStudentProjectMatrix,
  fetchModulesForUser,
  joinModuleByCode,
} from "./service.js";
import { parsePositiveInt, resolveAuthenticatedUserId } from "./controller.shared.js";
import { parseModuleJoinCodeBody, parseNormalizedModuleJoinCode } from "../moduleJoin/controller.parsers.js";

function sendJoinError(
  res: Response,
  error: { status: number; code: string; error: string },
) {
  return res.status(error.status).json({ code: error.code, error: error.error });
}

export async function getUserModulesHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  const parsedSearchQuery = parseSearchQuery(req.query.q);
  if (!parsedSearchQuery.ok) {
    return res.status(400).json({ error: parsedSearchQuery.error });
  }

  try {
    const modules = await fetchModulesForUser(userId, {
      staffOnly: req.query.scope === "staff",
      compact: req.query.compact === "1",
      ...(parsedSearchQuery.value ? { query: parsedSearchQuery.value } : {}),
    });
    return res.json(modules);
  } catch (error) {
    console.error("Error fetching user modules:", error);
    return res.status(500).json({ error: "Failed to fetch modules" });
  }
}

export async function joinModuleHandler(req: AuthRequest, res: Response) {
  const actorUserId = resolveAuthenticatedUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  const parsedBody = parseModuleJoinCodeBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ code: "INVALID_REQUEST", error: parsedBody.error });
  }

  const normalizedCode = parseNormalizedModuleJoinCode(parsedBody.value.code);
  if (!normalizedCode.ok) {
    return res.status(400).json({ code: "INVALID_CODE", error: normalizedCode.error });
  }

  const result = await joinModuleByCode(actorUserId, normalizedCode.value);
  if (!result.ok) {
    return sendJoinError(res, result);
  }

  return res.json(result.value);
}

export async function getModuleStaffListHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (moduleId === null) {
    return res.status(400).json({ error: "Invalid module id" });
  }

  try {
    const result = await fetchModuleStaffList(userId, moduleId);
    if (!result.ok) {
      return res.status(result.status).json({ error: "Forbidden" });
    }
    return res.json({ members: result.members });
  } catch (error) {
    console.error("Error fetching module staff list:", error);
    return res.status(500).json({ error: "Failed to fetch module staff" });
  }
}

export async function getModuleStudentProjectMatrixHandler(req: AuthRequest, res: Response) {
  const userId = resolveAuthenticatedUserId(req, res);
  if (userId === null) {
    return;
  }

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (moduleId === null) {
    return res.status(400).json({ error: "Invalid module id" });
  }

  try {
    const result = await fetchModuleStudentProjectMatrix(userId, moduleId);
    if (!result.ok) {
      return res.status(result.status).json({ error: "Forbidden" });
    }
    return res.json({ projects: result.projects, students: result.students });
  } catch (error) {
    console.error("Error fetching module student project matrix:", error);
    return res.status(500).json({ error: "Failed to fetch student project matrix" });
  }
}
