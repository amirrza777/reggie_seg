import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { listFeatureFlagsForUser } from "./service.js";

export async function listFeatureFlagsHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {return res.status(401).json({ error: "Not authenticated" });}

  const flags = await listFeatureFlagsForUser(userId);
  if (!flags) {return res.status(403).json({ error: "Forbidden" });}
  return res.json(flags);
}
