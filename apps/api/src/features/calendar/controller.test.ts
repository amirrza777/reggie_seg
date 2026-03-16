import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const serviceMocks = vi.hoisted(() => ({
  getCalendarEventsForUser: vi.fn(),
}));

vi.mock("./service.js", () => ({
  getCalendarEventsForUser: serviceMocks.getCalendarEventsForUser,
}));

import { getCalendarEventsHandler } from "./controller.js";

function createMockResponse() {
  const res = {} as Partial<Response> & {
    statusCode?: number;
    body?: unknown;
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response["status"];

  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as Response["json"];

  return res as Response & { statusCode?: number; body?: unknown };
}

describe("calendar controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid user id", async () => {
    const req = { query: { userId: "abc" } } as any;
    const res = createMockResponse();

    await getCalendarEventsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid user ID" });
  });

  it("returns events for a valid user id", async () => {
    const req = { query: { userId: "7" } } as any;
    const res = createMockResponse();
    const events = [{ id: "event-1", title: "Task Due", date: "2026-03-20T10:00:00.000Z", type: "task_due" }];

    serviceMocks.getCalendarEventsForUser.mockResolvedValue(events);

    await getCalendarEventsHandler(req, res);

    expect(serviceMocks.getCalendarEventsForUser).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith(events);
  });

  it("returns 500 when the service throws", async () => {
    const req = { query: { userId: "7" } } as any;
    const res = createMockResponse();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    serviceMocks.getCalendarEventsForUser.mockRejectedValue(new Error("boom"));

    await getCalendarEventsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch calendar events" });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
