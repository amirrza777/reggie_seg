import type { Request, Response } from "express";
import { sendProjectOrModuleArchivedConflict } from "../../shared/projectWriteGuard.js";
import { listMeetings, fetchMeeting, addMeeting, editMeeting, removeMeeting } from "./service.js";

/** Handles requests for list meetings. */
export async function listMeetingsHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);

  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const meetings = await listMeetings(teamId);
    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get meeting. */
export async function getMeetingHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  try {
    const meeting = await fetchMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for create meeting. */
export async function createMeetingHandler(req: Request, res: Response) {
  const { teamId, organiserId, title, date, subject, location, videoCallLink, agenda, participantIds } = req.body;

  if (!teamId || !organiserId || !title || !date) {
    return res.status(400).json({ error: "Missing required fields: teamId, organiserId, title, date" });
  }

  try {
    const meeting = await addMeeting({
      teamId,
      organiserId,
      title,
      date: new Date(date),
      subject,
      location,
      videoCallLink,
      agenda,
      ...(Array.isArray(participantIds) && { participantIds }),
    });
    res.status(201).json(meeting);
  } catch (error: any) {
    if (error?.code === "TEAM_ARCHIVED") {
      return res.status(409).json({ error: "This team is archived and cannot create new meetings" });
    }
    if (error?.code === "PROJECT_COMPLETED") {
      return res.status(409).json({ error: "This project is completed. Meeting creation is closed." });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateMeetingHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);
  const { userId, title, date, subject, location, videoCallLink, agenda, participantIds } = req.body;

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing required field: userId" });
  }

  try {
    const meeting = await editMeeting(meetingId, userId, {
      title,
      subject,
      location,
      videoCallLink,
      agenda,
      ...(date && { date: new Date(date) }),
      ...(Array.isArray(participantIds) && { participantIds }),
    });
    res.json(meeting);
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return res.status(404).json({ error: "Meeting not found" });
    if (error?.code === "FORBIDDEN") return res.status(403).json({ error: "You don't have permission to edit this meeting" });
    if (error?.code === "MEETING_PASSED") return res.status(409).json({ error: "Meeting details cannot be edited after the meeting date" });
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for delete meeting. */
export async function deleteMeetingHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  try {
    await removeMeeting(meetingId);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (sendProjectOrModuleArchivedConflict(res, error)) {
      return;
    }
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
