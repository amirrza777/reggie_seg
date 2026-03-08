import type { Request, Response } from "express";
import { listNotifications, countUnread, readNotification, readAllNotifications } from "./service.js";

export async function listNotificationsHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid or missing userId" });
  }

  try {
    const notifications = await listNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function countUnreadHandler(req: Request, res: Response) {
  const userId = Number(req.query.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid or missing userId" });
  }

  try {
    const count = await countUnread(userId);
    res.json({ count });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function markAsReadHandler(req: Request, res: Response) {
  const notificationId = Number(req.params.id);
  const { userId } = req.body;

  if (isNaN(notificationId)) {
    return res.status(400).json({ error: "Invalid notification ID" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing required field: userId" });
  }

  try {
    await readNotification(notificationId, userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function markAllAsReadHandler(req: Request, res: Response) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing required field: userId" });
  }

  try {
    await readAllNotifications(userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
