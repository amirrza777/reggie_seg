import type { Request, Response } from "express";
import { getCalendarEventsForUser } from "./service.js";
import { parseCalendarUserIdQuery } from "./controller.parsers.js";

/** Handles requests for get calendar events. */
export async function getCalendarEventsHandler(req: Request, res: Response) {
  const userId = parseCalendarUserIdQuery(req.query.userId);
  if (!userId.ok) return res.status(400).json({ error: userId.error });
  try {
    const events = await getCalendarEventsForUser(userId.value);
    res.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
}
