import { renderHook, act } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { useNotifications } from "./useNotifications";

const getNotificationsMock = vi.fn();
const getUnreadCountMock = vi.fn();
const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();
const dismissNotificationMock = vi.fn();

vi.mock("../api/client", () => ({
  getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
  getUnreadCount: (...args: unknown[]) => getUnreadCountMock(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
  markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsReadMock(...args),
  dismissNotification: (...args: unknown[]) => dismissNotificationMock(...args),
}));

const NOTIFICATION_A = {
  id: 1, userId: 5, type: "MENTION", message: "You were mentioned",
  link: "/projects/1/meetings/2", read: false, createdAt: "2026-02-22T10:00:00Z",
};

const NOTIFICATION_B = {
  id: 2, userId: 5, type: "MEETING_CREATED", message: "New meeting",
  link: "/projects/1/meetings/3", read: true, createdAt: "2026-02-23T10:00:00Z",
};

beforeEach(() => {
  vi.useFakeTimers();
  getNotificationsMock.mockReset();
  getUnreadCountMock.mockReset();
  markNotificationReadMock.mockReset();
  markAllNotificationsReadMock.mockReset();
  dismissNotificationMock.mockReset();
  getUnreadCountMock.mockResolvedValue({ count: 0 });
  getNotificationsMock.mockResolvedValue([]);
  markNotificationReadMock.mockResolvedValue(undefined);
  markAllNotificationsReadMock.mockResolvedValue(undefined);
  dismissNotificationMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNotifications", () => {
  it("starts with empty notifications and zero unread", () => {
    const { result } = renderHook(() => useNotifications(5));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("does not fetch when userId is null", async () => {
    renderHook(() => useNotifications(null));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(getUnreadCountMock).not.toHaveBeenCalled();
  });

  it("fetches unread count on mount", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 3 });

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(getUnreadCountMock).toHaveBeenCalledWith(5);
    expect(result.current.unreadCount).toBe(3);
  });

  it("polls unread count every 30 seconds", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 1 });

    renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(getUnreadCountMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(getUnreadCountMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(getUnreadCountMock).toHaveBeenCalledTimes(3);
  });

  it("stops polling on unmount", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 0 });

    const { unmount } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(getUnreadCountMock).toHaveBeenCalledTimes(1);
  });

  it("keeps previous unread count when polling fails", async () => {
    getUnreadCountMock.mockResolvedValueOnce({ count: 5 });

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.unreadCount).toBe(5);

    getUnreadCountMock.mockRejectedValueOnce(new Error("network error"));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.unreadCount).toBe(5);
  });

  it("fetchAll loads all notifications", async () => {
    getNotificationsMock.mockResolvedValue([NOTIFICATION_A, NOTIFICATION_B]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      await result.current.fetchAll();
    });

    expect(getNotificationsMock).toHaveBeenCalledWith(5);
    expect(result.current.notifications).toEqual([NOTIFICATION_A, NOTIFICATION_B]);
  });

  it("fetchAll does nothing when userId is null", async () => {
    const { result } = renderHook(() => useNotifications(null));

    await act(async () => {
      await result.current.fetchAll();
    });

    expect(getNotificationsMock).not.toHaveBeenCalled();
  });

  it("fetchAll keeps existing notifications when fetch fails", async () => {
    getNotificationsMock.mockResolvedValueOnce([NOTIFICATION_A]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      await result.current.fetchAll();
    });

    getNotificationsMock.mockRejectedValueOnce(new Error("fail"));

    await act(async () => {
      await result.current.fetchAll();
    });

    expect(result.current.notifications).toEqual([NOTIFICATION_A]);
  });

  it("markRead updates the notification and decrements unread count", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 2 });
    getNotificationsMock.mockResolvedValue([NOTIFICATION_A, NOTIFICATION_B]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      await result.current.fetchAll();
    });

    await act(async () => {
      await result.current.markRead(1);
    });

    expect(markNotificationReadMock).toHaveBeenCalledWith(1, 5);
    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(1);
  });

  it("markRead does not go below zero", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 0 });

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    getNotificationsMock.mockResolvedValue([NOTIFICATION_A]);

    await act(async () => {
      await result.current.fetchAll();
    });

    await act(async () => {
      await result.current.markRead(1);
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("markRead does nothing when userId is null", async () => {
    const { result } = renderHook(() => useNotifications(null));

    await act(async () => {
      await result.current.markRead(1);
    });

    expect(markNotificationReadMock).not.toHaveBeenCalled();
  });

  it("markAllRead marks every notification as read and resets count", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 2 });
    getNotificationsMock.mockResolvedValue([NOTIFICATION_A, { ...NOTIFICATION_B, read: false }]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      await result.current.fetchAll();
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(markAllNotificationsReadMock).toHaveBeenCalledWith(5);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markAllRead does nothing when userId is null", async () => {
    const { result } = renderHook(() => useNotifications(null));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(markAllNotificationsReadMock).not.toHaveBeenCalled();
  });

  it("dismiss removes the notification from the list", async () => {
    getNotificationsMock.mockResolvedValue([NOTIFICATION_A, NOTIFICATION_B]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      await result.current.fetchAll();
    });

    await act(async () => {
      await result.current.dismiss(2);
    });

    expect(dismissNotificationMock).toHaveBeenCalledWith(2, 5);
    expect(result.current.notifications).toEqual([NOTIFICATION_A]);
  });

  it("dismiss decrements unread count when dismissing an unread notification", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 1 });
    getNotificationsMock.mockResolvedValue([NOTIFICATION_A]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      await result.current.fetchAll();
    });

    await act(async () => {
      await result.current.dismiss(1);
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("dismiss does not decrement unread count when dismissing a read notification", async () => {
    getUnreadCountMock.mockResolvedValue({ count: 1 });
    getNotificationsMock.mockResolvedValue([NOTIFICATION_A, NOTIFICATION_B]);

    const { result } = renderHook(() => useNotifications(5));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      await result.current.fetchAll();
    });

    await act(async () => {
      await result.current.dismiss(2);
    });

    expect(result.current.unreadCount).toBe(1);
  });

  it("dismiss does nothing when userId is null", async () => {
    const { result } = renderHook(() => useNotifications(null));

    await act(async () => {
      await result.current.dismiss(1);
    });

    expect(dismissNotificationMock).not.toHaveBeenCalled();
  });
});
