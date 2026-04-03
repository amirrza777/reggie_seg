import type { Request, Response } from "express";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import { saveMinutes, fetchMeeting } from "./service.js";

/** Handles requests for save minutes. */
export async function saveMinutesHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);
  const { writerId, content } = req.body;

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  if (!writerId || !content) {
    return res.status(400).json({ error: "Missing required fields: writerId, content" });
  }

  try {
    const minutes = await saveMinutes(meetingId, writerId, content);
    res.json(minutes);
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return res.status(404).json({ error: "Meeting not found" });
    if (error?.code === "FORBIDDEN") return res.status(403).json({ error: "You don't have permission to edit these minutes" });
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error saving minutes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get minutes. */
export async function getMinutesHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  try {
    const meeting = await fetchMeeting(meetingId);
    if (!meeting || !meeting.minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }
    res.json(meeting.minutes);
  } catch (error) {
    console.error("Error fetching minutes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
