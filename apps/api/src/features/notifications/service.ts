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
  MENTION: "You were mentioned",
  TEAM_INVITE: "You have been invited to join a team",
  TEAM_ALLOCATED: "You have been allocated to a team",
  LOW_ATTENDANCE: "Your meeting attendance is low",
  MEETING_CREATED: "A new meeting has been scheduled",
  MEETING_DELETED: "A meeting has been removed",
  MEETING_UPDATED: "A meeting has been updated",
  DEADLINE_OVERRIDE_GRANTED: "Your deadline has been updated",
  TEAM_HEALTH_SUBMITTED: "A team health message has been submitted",
  FORUM_REPLY: "Someone replied to your forum post",
  FORUM_REPORTED: "A forum post has been reported",
};

const EMAIL_SUPPRESSED_TYPES = new Set<NotificationType>(["TEAM_INVITE"]);

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

  if (EMAIL_SUPPRESSED_TYPES.has(data.type)) {
    return notification;
  }

  const email = await getUserEmail(data.userId);
  if (email) {
    const subject = NOTIFICATION_SUBJECTS[data.type];
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const generatedAt = new Date().toUTCString();
    const lines = [
      "You have a new Team Feedback notification.",
      `Type: ${subject}`,
      `Details: ${data.message}`,
      `Received at (UTC): ${generatedAt}`,
    ];
    if (data.link) {
      lines.push(`Open in Team Feedback: ${baseUrl}${data.link}`);
    } else {
      lines.push(`Open notifications: ${baseUrl}/notifications`);
    }
    lines.push("", "You are receiving this because this activity is associated with your account.");

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
