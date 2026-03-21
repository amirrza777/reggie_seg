"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useUser } from "@/features/auth/context";
import { useNotifications } from "../hooks/useNotifications";
import type { Notification } from "../types";

export function NotificationBell() {
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unreadCount, fetchAll, markRead, markAllRead, dismiss } = useNotifications(user?.id ?? null);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await markRead(notification.id);
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  if (!user) return null;

  return (
    <div className="notification-bell" ref={menuRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-bell__dropdown" data-elevation="popup">
          <div className="notification-bell__header">
            <span className="notification-bell__title">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-bell__mark-all"
                onClick={markAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="notification-bell__empty">No notifications yet.</p>
          ) : (
            <div className="notification-bell__list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={
                    notification.read
                      ? "notification-bell__item"
                      : "notification-bell__item notification-bell__item--unread"
                  }
                >
                  <button
                    type="button"
                    className="notification-bell__item-content"
                    onClick={() => handleClick(notification)}
                  >
                    <span className="notification-bell__message">{notification.message}</span>
                    <span className="notification-bell__time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notification-bell__dismiss"
                    onClick={() => dismiss(notification.id)}
                    aria-label="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
