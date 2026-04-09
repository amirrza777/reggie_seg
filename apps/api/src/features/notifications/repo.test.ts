import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNotificationsByUserId,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserEmail,
} from "./repo.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../../shared/db.js";

describe("notifications repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches notifications for a user ordered by date descending", async () => {
    await getNotificationsByUserId(5);
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 5 },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("counts unread notifications for a user", async () => {
    await getUnreadCount(5);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 5, read: false },
    });
  });

  it("creates a notification", async () => {
    const data = { userId: 5, type: "MENTION" as const, message: "You were mentioned", link: "/projects/1" };
    await createNotification(data);
    expect(prisma.notification.create).toHaveBeenCalledWith({ data });
  });

  it("marks a specific notification as read for the owner", async () => {
    await markAsRead(7, 5);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 7, userId: 5 },
      data: { read: true },
    });
  });

  it("marks all notifications as read for a user", async () => {
    await markAllAsRead(5);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 5, read: false },
      data: { read: true },
    });
  });

  it("deletes a notification for the owner", async () => {
    await deleteNotification(7, 5);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: 7, userId: 5 },
    });
  });

  it("returns the email for a user that exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ email: "user@test.com" });
    const result = await getUserEmail(5);
    expect(result).toBe("user@test.com");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { email: true },
    });
  });

  it("returns null when the user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const result = await getUserEmail(99);
    expect(result).toBeNull();
  });
});
