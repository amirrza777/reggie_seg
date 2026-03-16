import type { Request, Response } from "express";
import { getCalendarEventsForUser } from "./service.js";

/** Handles requests for get calendar events. */
export async function getCalendarEventsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  try {
    const events = await getCalendarEventsForUser(userId);
    res.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
}
