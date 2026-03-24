import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";

export function parsePositiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolveAuthenticatedUserId(req: AuthRequest, res: Response): number | null {
  const authUserId = req.user?.sub;
  if (!authUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const queryUserId = req.query?.userId;
  if (queryUserId !== undefined) {
    const parsedQueryUserId = Number(queryUserId);
    if (Number.isNaN(parsedQueryUserId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return null;
    }
    if (parsedQueryUserId !== authUserId) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
  }

  return authUserId;
}
