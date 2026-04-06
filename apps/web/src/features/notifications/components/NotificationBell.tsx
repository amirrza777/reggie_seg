"use client";

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useUser } from "@/features/auth/useUser";
import { useNotifications } from "../hooks/useNotifications";
import type { Notification } from "../types";

const NOTIFICATION_DROPDOWN_ID = "notification-bell-menu";
const NOTIFICATION_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatNotificationTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return NOTIFICATION_TIME_FORMATTER.format(date);
}

function sortNotifications(notifications: Notification[]) {
  return [...notifications].sort((leftNotification, rightNotification) => {
    const leftTime = new Date(rightNotification.createdAt).getTime();
    const rightTime = new Date(leftNotification.createdAt).getTime();
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return rightNotification.id - leftNotification.id;
    }
    if (Number.isNaN(leftTime)) {
      return 1;
    }
    if (Number.isNaN(rightTime)) {
      return -1;
    }
    return leftTime - rightTime;
  });
}

function useFetchNotificationsOnOpen(open: boolean, fetchAll: () => Promise<void>) {
  useEffect(() => {
    if (open) {
      void fetchAll();
    }
  }, [open, fetchAll]);
}

function useCloseBellOnOutsideClick(menuRef: RefObject<HTMLDivElement | null>, setOpen: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (menuRef.current.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuRef, setOpen]);
}

function NotificationBellTrigger({ open, unreadCount, onToggle }: { open: boolean; unreadCount: number; onToggle: () => void }) {
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  return (
    <button type="button" className="notification-bell__trigger" onClick={onToggle} aria-label="Notifications" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? NOTIFICATION_DROPDOWN_ID : undefined}>
      <Bell size={18} />
      {unreadCount > 0 ? <span className="notification-bell__badge">{badgeLabel}</span> : null}
    </button>
  );
}

function NotificationBellListItem({
  notification,
  onClick,
  onDismiss,
}: {
  notification: Notification;
  onClick: (notification: Notification) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
}) {
  const itemClassName = notification.read ? "notification-bell__item" : "notification-bell__item notification-bell__item--unread";
  return (
    <div className={itemClassName}>
      <button type="button" className="notification-bell__item-content" onClick={() => void onClick(notification)}>
        <span className="notification-bell__message">{notification.message}</span>
        <span className="notification-bell__time">{formatNotificationTimestamp(notification.createdAt)}</span>
      </button>
      <button type="button" className="notification-bell__dismiss" onClick={() => void onDismiss(notification.id)} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  );
}

function NotificationBellList({
  notifications,
  onClick,
  onDismiss,
}: {
  notifications: Notification[];
  onClick: (notification: Notification) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
}) {
  if (notifications.length === 0) {
    return <p className="notification-bell__empty">No notifications yet.</p>;
  }

  return (
    <div className="notification-bell__list">
      {notifications.map((notification) => (
        <NotificationBellListItem key={notification.id} notification={notification} onClick={onClick} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function NotificationBellDropdown({
  open,
  unreadCount,
  notifications,
  onMarkAllRead,
  onNotificationClick,
  onDismiss,
}: {
  open: boolean;
  unreadCount: number;
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onNotificationClick: (notification: Notification) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
}) {
  if (!open) {
    return null;
  }

  return (
    <div id={NOTIFICATION_DROPDOWN_ID} className="notification-bell__dropdown" role="menu" aria-label="Notifications">
      <div className="notification-bell__header">
        <span className="notification-bell__title">Notifications</span>
        {unreadCount > 0 ? <button type="button" className="notification-bell__mark-all" onClick={() => void onMarkAllRead()}>Mark all as read</button> : null}
      </div>
      <NotificationBellList notifications={notifications} onClick={onNotificationClick} onDismiss={onDismiss} />
    </div>
  );
}

export function NotificationBell() {
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unreadCount, fetchAll, markRead, markAllRead, dismiss } = useNotifications(user?.id ?? null);

  useFetchNotificationsOnOpen(open, fetchAll);
  useCloseBellOnOutsideClick(menuRef, setOpen);

  if (!user) {
    return null;
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markRead(notification.id);
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="notification-bell" ref={menuRef}>
      <NotificationBellTrigger open={open} unreadCount={unreadCount} onToggle={() => setOpen((value) => !value)} />
      <NotificationBellDropdown open={open} unreadCount={unreadCount} notifications={sortNotifications(notifications)} onMarkAllRead={markAllRead} onNotificationClick={handleNotificationClick} onDismiss={dismiss} />
    </div>
  );
}
