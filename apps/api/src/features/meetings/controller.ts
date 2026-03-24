import type { Request, Response } from "express";
import { listMeetings, fetchMeeting, addMeeting, editMeeting, removeMeeting, markAttendance, saveMinutes, addComment, removeComment, fetchMeetingSettings } from "./service.js";
import {
  parseAddCommentBody,
  parseCommentIdParam,
  parseCreateMeetingBody,
  parseMarkAttendanceBody,
  parseMeetingIdParam,
  parseSaveMinutesBody,
  parseTeamIdParam,
  parseUpdateMeetingBody,
} from "./controller.parsers.js";

/** Handles requests for list meetings. */
export async function listMeetingsHandler(req: Request, res: Response) {
  const teamId = parseTeamIdParam(req.params.teamId);
  if (!teamId.ok) return res.status(400).json({ error: teamId.error });

  try {
    const meetings = await listMeetings(teamId.value);
    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get meeting. */
export async function getMeetingHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  try {
    const meeting = await fetchMeeting(meetingId.value);
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
  const parsedBody = parseCreateMeetingBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const meeting = await addMeeting(parsedBody.value);
    res.status(201).json(meeting);
  } catch (error: any) {
    if (error?.code === "TEAM_ARCHIVED") {
      return res.status(409).json({ error: "This team is archived and cannot create new meetings" });
    }
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateMeetingHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  const parsedBody = parseUpdateMeetingBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const { userId, ...updates } = parsedBody.value;
    const meeting = await editMeeting(meetingId.value, userId, updates);
    res.json(meeting);
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return res.status(404).json({ error: "Meeting not found" });
    if (error?.code === "FORBIDDEN") return res.status(403).json({ error: "Only the organiser can edit this meeting" });
    if (error?.code === "MEETING_PASSED") return res.status(409).json({ error: "Meeting details cannot be edited after the meeting date" });
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for delete meeting. */
export async function deleteMeetingHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  try {
    await removeMeeting(meetingId.value);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Meeting not found" });
    }
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for mark attendance. */
export async function markAttendanceHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  const parsedBody = parseMarkAttendanceBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    await markAttendance(meetingId.value, parsedBody.value.records);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for save minutes. */
export async function saveMinutesHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  const parsedBody = parseSaveMinutesBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const minutes = await saveMinutes(meetingId.value, parsedBody.value.writerId, parsedBody.value.content);
    res.json(minutes);
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return res.status(404).json({ error: "Meeting not found" });
    if (error?.code === "FORBIDDEN") return res.status(403).json({ error: "Only the original writer can edit these minutes" });
    console.error("Error saving minutes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get minutes. */
export async function getMinutesHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  try {
    const meeting = await fetchMeeting(meetingId.value);
    if (!meeting || !meeting.minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }
    res.json(meeting.minutes);
  } catch (error) {
    console.error("Error fetching minutes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for add comment. */
export async function addCommentHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  const parsedBody = parseAddCommentBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const comment = await addComment(
      meetingId.value,
      parsedBody.value.userId,
      parsedBody.value.content,
      parsedBody.value.teamId,
    );
    res.status(201).json(comment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMeetingSettingsHandler(req: Request, res: Response) {
  const meetingId = parseMeetingIdParam(req.params.meetingId);
  if (!meetingId.ok) return res.status(400).json({ error: meetingId.error });

  try {
    const settings = await fetchMeetingSettings(meetingId.value);
    if (!settings) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(settings);
  } catch (error) {
    console.error("Error fetching meeting settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for delete comment. */
export async function deleteCommentHandler(req: Request, res: Response) {
  const commentId = parseCommentIdParam(req.params.commentId);
  if (!commentId.ok) return res.status(400).json({ error: commentId.error });

  try {
    await removeComment(commentId.value);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Comment not found" });
    }
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
