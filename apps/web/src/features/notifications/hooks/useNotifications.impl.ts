import { useState, useEffect, useCallback } from "react";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "../api/client";
import type { Notification } from "../types";

const POLL_INTERVAL = 30_000;

export function useNotifications(userId: number | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;

    async function fetchCount() {
      try {
        const { count } = await getUnreadCount(currentUserId);
        setUnreadCount(count);
      } catch {
        // Keep the previous unread count if polling fails.
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getNotifications(userId);
      setNotifications(data);
    } catch {
      // Keep existing notifications if refresh fails.
    }
  }, [userId]);

  const markRead = useCallback(async (notificationId: number) => {
    if (!userId) return;
    await markNotificationRead(notificationId, userId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  const dismiss = useCallback(async (notificationId: number) => {
    if (!userId) return;
    const notification = notifications.find((n) => n.id === notificationId);
    await dismissNotification(notificationId, userId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [userId, notifications]);

  return { notifications, unreadCount, fetchAll, markRead, markAllRead, dismiss };
}
