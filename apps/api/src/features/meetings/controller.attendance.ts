import type { Request, Response } from "express";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import { markAttendance } from "./service.js";

/** Handles requests for mark attendance. */
export async function markAttendanceHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);
  const { records } = req.body;

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Records must be a non-empty array" });
  }

  try {
    await markAttendance(meetingId, records);
    res.json({ ok: true });
  } catch (error) {
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    if ((error as { code?: string })?.code === "NOT_FOUND") {
      return res.status(404).json({ error: "Meeting not found" });
    }
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
