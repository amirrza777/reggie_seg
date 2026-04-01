import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { findJoinActor } from "./repo.js";
import { parseModuleIdParam, parseModuleJoinCodeBody, parseNormalizedModuleJoinCode } from "./controller.parsers.js";
import { getModuleJoinCode, joinModuleByCode, rotateModuleJoinCode } from "./service.js";

function sendModuleJoinError(
  res: Response,
  error: { status: number; code: string; error: string },
) {
  return res.status(error.status).json({ code: error.code, error: error.error });
}

export async function joinModuleHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Unauthorized" });
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
    return sendModuleJoinError(res, result);
  }

  return res.json(result.value);
}

export async function getModuleJoinCodeHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Unauthorized" });
  }

  const parsedModuleId = parseModuleIdParam(req.params.moduleId);
  if (!parsedModuleId.ok) {
    return res.status(400).json({ code: "INVALID_REQUEST", error: parsedModuleId.error });
  }

  const actor = await findJoinActor(actorUserId);
  if (!actor) {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Unauthorized" });
  }

  const result = await getModuleJoinCode(actor, parsedModuleId.value);
  if (!result.ok) {
    return sendModuleJoinError(res, result);
  }

  res.setHeader("Cache-Control", "no-store");
  return res.json(result.value);
}

export async function rotateModuleJoinCodeHandler(req: AuthRequest, res: Response) {
  const actorUserId = req.user?.sub;
  if (!actorUserId) {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Unauthorized" });
  }

  const parsedModuleId = parseModuleIdParam(req.params.moduleId);
  if (!parsedModuleId.ok) {
    return res.status(400).json({ code: "INVALID_REQUEST", error: parsedModuleId.error });
  }

  const actor = await findJoinActor(actorUserId);
  if (!actor) {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Unauthorized" });
  }

  const result = await rotateModuleJoinCode(actor, parsedModuleId.value);
  if (!result.ok) {
    return sendModuleJoinError(res, result);
  }

  res.setHeader("Cache-Control", "no-store");
  return res.json(result.value);
}

/**
 * Compatibility route for legacy clients still calling /projects/modules/join.
 * Deprecation: remove in MJ-013 after all clients migrate to /module-join/join.
 */
export async function joinModuleCompatibilityHandler(req: AuthRequest, res: Response) {
  return joinModuleHandler(req, res);
}
