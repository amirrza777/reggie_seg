import type { Request, Response } from "express";
import { listNotifications, countUnread, readNotification, readAllNotifications, removeNotification } from "./service.js";
import {
  parseNotificationActionBody,
  parseNotificationIdParam,
  parseNotificationUserIdQuery,
} from "./controller.parsers.js";

export async function listNotificationsHandler(req: Request, res: Response) {
  const userId = parseNotificationUserIdQuery(req.query.userId);
  if (!userId.ok) return res.status(400).json({ error: userId.error });

  try {
    const notifications = await listNotifications(userId.value);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function countUnreadHandler(req: Request, res: Response) {
  const userId = parseNotificationUserIdQuery(req.query.userId);
  if (!userId.ok) return res.status(400).json({ error: userId.error });

  try {
    const count = await countUnread(userId.value);
    res.json({ count });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function markAsReadHandler(req: Request, res: Response) {
  const notificationId = parseNotificationIdParam(req.params.id);
  if (!notificationId.ok) return res.status(400).json({ error: notificationId.error });
  const parsedBody = parseNotificationActionBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    await readNotification(notificationId.value, parsedBody.value.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function markAllAsReadHandler(req: Request, res: Response) {
  const parsedBody = parseNotificationActionBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    await readAllNotifications(parsedBody.value.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteNotificationHandler(req: Request, res: Response) {
  const notificationId = parseNotificationIdParam(req.params.id);
  if (!notificationId.ok) return res.status(400).json({ error: notificationId.error });
  const parsedBody = parseNotificationActionBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    await removeNotification(notificationId.value, parsedBody.value.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
