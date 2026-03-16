import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { dismissInactivityFlag, isStaffOrAdmin } from "./service.js";

export async function dismissFlagHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const teamId = Number(req.params.teamId);
  if (Number.isNaN(teamId)) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }
  const result = await dismissInactivityFlag(teamId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.value);
}
