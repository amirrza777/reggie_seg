import type { NotificationType } from "@prisma/client";
import {
  getNotificationsByUserId,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserEmail,
} from "./repo.js";
import { sendEmail } from "../../shared/email.js";

const NOTIFICATION_SUBJECTS: Record<NotificationType, string> = {
  MENTION: "You were mentioned in a comment",
  TEAM_INVITE: "You have been invited to join a team",
  LOW_ATTENDANCE: "Your meeting attendance is low",
  MEETING_CREATED: "A new meeting has been scheduled",
  MEETING_DELETED: "A meeting has been removed",
};

export function listNotifications(userId: number) {
  return getNotificationsByUserId(userId);
}

export function countUnread(userId: number) {
  return getUnreadCount(userId);
}

export async function addNotification(data: {
  userId: number;
  type: NotificationType;
  message: string;
  link?: string;
}) {
  const notification = await createNotification(data);

  const email = await getUserEmail(data.userId);
  if (email) {
    const subject = NOTIFICATION_SUBJECTS[data.type];
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const lines = [data.message];
    if (data.link) lines.push(`\nView it here: ${baseUrl}${data.link}`);

    await sendEmail({ to: email, subject, text: lines.join("\n") }).catch((err) =>
      console.error("Failed to send notification email:", err)
    );
  }

  return notification;
}

export function readNotification(notificationId: number, userId: number) {
  return markAsRead(notificationId, userId);
}

export function readAllNotifications(userId: number) {
  return markAllAsRead(userId);
}

export function removeNotification(notificationId: number, userId: number) {
  return deleteNotification(notificationId, userId);
}
