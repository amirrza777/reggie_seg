import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetch } from "@/shared/api/http";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "./client";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("notifications api client", () => {
  const apiFetchMock = vi.mocked(apiFetch);

  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({} as any);
  });

  it("fetches notifications for a user", async () => {
    await getNotifications(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/notifications?userId=5");
  });

  it("fetches unread count for a user", async () => {
    await getUnreadCount(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/notifications/unread-count?userId=5");
  });

  it("marks a notification as read", async () => {
    await markNotificationRead(1, 5);
    expect(apiFetchMock).toHaveBeenCalledWith("/notifications/1/read", {
      method: "PATCH",
      body: JSON.stringify({ userId: 5 }),
    });
  });

  it("marks all notifications as read", async () => {
    await markAllNotificationsRead(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/notifications/read-all", {
      method: "POST",
      body: JSON.stringify({ userId: 5 }),
    });
  });

  it("dismisses a notification", async () => {
    await dismissNotification(1, 5);
    expect(apiFetchMock).toHaveBeenCalledWith("/notifications/1", {
      method: "DELETE",
      body: JSON.stringify({ userId: 5 }),
    });
  });
});
