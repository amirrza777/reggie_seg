import { apiFetch } from "@/shared/api/http";
import type { Notification } from "../types";

export async function getNotifications(userId: number) {
  return apiFetch<Notification[]>(`/notifications?userId=${userId}`);
}

export async function getUnreadCount(userId: number) {
  return apiFetch<{ count: number }>(`/notifications/unread-count?userId=${userId}`);
}

export async function markNotificationRead(notificationId: number, userId: number) {
  return apiFetch(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  });
}

export async function markAllNotificationsRead(userId: number) {
  return apiFetch("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}
