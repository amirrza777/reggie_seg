import type { Request, Response } from "express";
import { fetchMeetingSettings, fetchTeamMeetingSettings } from "./service.js";

export async function getMeetingSettingsHandler(req: Request, res: Response) {
  const meetingId = Number(req.params.meetingId);

  if (isNaN(meetingId)) {
    return res.status(400).json({ error: "Invalid meeting ID" });
  }

  try {
    const settings = await fetchMeetingSettings(meetingId);
    if (!settings) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(settings);
  } catch (error) {
    console.error("Error fetching meeting settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTeamMeetingSettingsHandler(req: Request, res: Response) {
  const teamId = Number(req.params.teamId);

  if (isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    const settings = await fetchTeamMeetingSettings(teamId);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching team meeting settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
