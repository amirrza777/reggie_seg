import type { Request, Response } from "express";
import { listMeetings, fetchMeeting, addMeeting, removeMeeting, markAttendance, saveMinutes, addComment, removeComment } from "./service.js";

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

export async function createMeetingHandler(req: Request, res: Response) {
  const { teamId, organiserId, title, date, subject, location, agenda } = req.body;

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
      agenda,
    });
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

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
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

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
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

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
  } catch (error) {
    console.error("Error saving minutes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

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

export async function addCommentHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);
  const { userId, content } = req.body;

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  if (!userId || !content) {
    return res.status(400).json({ error: "Missing required fields: userId, content" });
  }

  try {
    const comment = await addComment(meetingId, userId, content);
    res.status(201).json(comment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCommentHandler(req: Request, res: Response) {
  const commentId = Number(req.params.commentId);

  if (isNaN(commentId)) {
    return res.status(400).json({ error: "Invalid comment ID" });
  }

  try {
    await removeComment(commentId);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Comment not found" });
    }
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
