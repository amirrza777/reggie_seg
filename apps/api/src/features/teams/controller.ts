import type { Response } from "express";
import type { AuthRequest } from "../../auth/middleware.js";
import { dismissInactivityFlag, isStaffOrAdmin } from "./service.js";
import { parseDismissTeamIdParam } from "./controller.parsers.js";

export async function dismissFlagHandler(req: AuthRequest, res: Response) {
  if (!(await isStaffOrAdmin(req.user?.sub))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const teamId = parseDismissTeamIdParam(req.params.teamId);
  if (!teamId.ok) {
    res.status(400).json({ error: teamId.error });
    return;
  }
  const result = await dismissInactivityFlag(teamId.value);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.value);
}
