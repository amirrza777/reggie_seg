import type { NotificationType } from "@prisma/client";
import {
  getNotificationsByUserId,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "./repo.js";

export function listNotifications(userId: number) {
  return getNotificationsByUserId(userId);
}

export function countUnread(userId: number) {
  return getUnreadCount(userId);
}

export function addNotification(data: {
  userId: number;
  type: NotificationType;
  message: string;
  link?: string;
}) {
  return createNotification(data);
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
