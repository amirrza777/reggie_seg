import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  countUnreadHandler,
  deleteNotificationHandler,
  listNotificationsHandler,
  markAllAsReadHandler,
  markAsReadHandler,
} from "./controller.js";
import * as service from "./service.js";

vi.mock("./service.js", () => ({
  listNotifications: vi.fn(),
  countUnread: vi.fn(),
  readNotification: vi.fn(),
  readAllNotifications: vi.fn(),
  removeNotification: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("notifications controller", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists notifications for a valid user", async () => {
    (service.listNotifications as any).mockResolvedValue([{ id: 1 }]);
    const res = mockResponse();

    await listNotificationsHandler({ query: { userId: "3" } } as any, res);

    expect(service.listNotifications).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("returns 400 for invalid notification list/count queries", async () => {
    let res = mockResponse();
    await listNotificationsHandler({ query: { userId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res = mockResponse();
    await countUnreadHandler({ query: { userId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("counts unread notifications", async () => {
    (service.countUnread as any).mockResolvedValue(4);
    const res = mockResponse();

    await countUnreadHandler({ query: { userId: "3" } } as any, res);

    expect(service.countUnread).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith({ count: 4 });
  });

  it("marks a notification as read", async () => {
    const res = mockResponse();

    await markAsReadHandler({ params: { id: "7" }, body: { userId: 3 } } as any, res);

    expect(service.readNotification).toHaveBeenCalledWith(7, 3);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("marks all notifications as read", async () => {
    const res = mockResponse();

    await markAllAsReadHandler({ body: { userId: 3 } } as any, res);

    expect(service.readAllNotifications).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("deletes a notification", async () => {
    const res = mockResponse();

    await deleteNotificationHandler({ params: { id: "7" }, body: { userId: 3 } } as any, res);

    expect(service.removeNotification).toHaveBeenCalledWith(7, 3);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 400 for invalid notification action payloads", async () => {
    let res = mockResponse();
    await markAsReadHandler({ params: { id: "x" }, body: { userId: 3 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res = mockResponse();
    await markAllAsReadHandler({ body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res = mockResponse();
    await deleteNotificationHandler({ params: { id: "7" }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 when listing notifications fails", async () => {
    (service.listNotifications as any).mockRejectedValue(new Error("db error"));
    const res = mockResponse();
    await listNotificationsHandler({ query: { userId: "3" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 when counting unread fails", async () => {
    (service.countUnread as any).mockRejectedValue(new Error("db error"));
    const res = mockResponse();
    await countUnreadHandler({ query: { userId: "3" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 when marking as read fails", async () => {
    (service.readNotification as any).mockRejectedValue(new Error("db error"));
    const res = mockResponse();
    await markAsReadHandler({ params: { id: "7" }, body: { userId: 3 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 when marking all as read fails", async () => {
    (service.readAllNotifications as any).mockRejectedValue(new Error("db error"));
    const res = mockResponse();
    await markAllAsReadHandler({ body: { userId: 3 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 when deleting a notification fails", async () => {
    (service.removeNotification as any).mockRejectedValue(new Error("db error"));
    const res = mockResponse();
    await deleteNotificationHandler({ params: { id: "7" }, body: { userId: 3 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
