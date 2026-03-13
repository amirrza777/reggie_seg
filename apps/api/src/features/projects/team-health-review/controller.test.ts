import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  getStaffTeamDeadlineHandler,
  resolveStaffTeamHealthMessageHandler,
  reviewStaffTeamHealthMessageHandler,
} from "./controller.js";
import * as service from "./service.js";

vi.mock("./service.js", () => ({
  InvalidDeadlineOverrideError: class InvalidDeadlineOverrideError extends Error {
    constructor(field: string) {
      super(`${field} cannot be earlier than the current deadline`);
    }
  },
  ResolvedTeamHealthMessageAlreadyExistsError: class ResolvedTeamHealthMessageAlreadyExistsError extends Error {
    constructor() {
      super("A resolved team health message already exists for this team. Edit that request instead.");
    }
  },
  fetchTeamDeadlineForStaff: vi.fn(),
  reviewTeamHealthMessageForStaff: vi.fn(),
  resolveTeamHealthMessageWithDeadlineOverrideForStaff: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("team-health-review controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStaffTeamDeadlineHandler validates ids and returns deadline", async () => {
    const badRes = mockResponse();
    await getStaffTeamDeadlineHandler(
      { params: { projectId: "x", teamId: "2" }, query: { userId: "7" } } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamDeadlineForStaff as any).mockResolvedValueOnce({
      baseDeadline: { taskDueDate: "2026-03-10" },
      effectiveDeadline: { taskDueDate: "2026-03-12" },
      deadlineInputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 2 },
    });
    const okRes = mockResponse();
    await getStaffTeamDeadlineHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      okRes
    );
    expect(service.fetchTeamDeadlineForStaff).toHaveBeenCalledWith(7, 3, 2);
    expect(okRes.json).toHaveBeenCalledWith({
      deadline: {
        baseDeadline: { taskDueDate: "2026-03-10" },
        effectiveDeadline: { taskDueDate: "2026-03-12" },
        deadlineInputMode: "SHIFT_DAYS",
        shiftDays: { taskDueDate: 2 },
      },
    });
  });

  it("reviewStaffTeamHealthMessageHandler validates resolved flag and delegates", async () => {
    const badRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: "yes" },
      } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.reviewTeamHealthMessageForStaff as any).mockResolvedValueOnce({ id: 11, resolved: false });
    const okRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: false },
      } as any,
      okRes
    );
    expect(service.reviewTeamHealthMessageForStaff).toHaveBeenCalledWith(7, 3, 2, 11, false, undefined);
    expect(okRes.json).toHaveBeenCalledWith({ request: { id: 11, resolved: false } });
  });

  it("reviewStaffTeamHealthMessageHandler requires response text when resolving", async () => {
    const res = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: true },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "responseText is required when resolving a request" });
  });

  it("resolveStaffTeamHealthMessageHandler validates dates and delegates", async () => {
    const badRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, taskDueDate: "not-a-date" },
      } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.resolveTeamHealthMessageWithDeadlineOverrideForStaff as any).mockResolvedValueOnce({
      request: { id: 11, resolved: true },
      deadline: { taskDueDate: "2026-03-15T12:00:00.000Z" },
    });
    const okRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: {
          userId: 7,
          taskDueDate: "2026-03-15T12:00:00.000Z",
          deadlineInputMode: "SHIFT_DAYS",
          shiftDays: { taskDueDate: 3 },
        },
      } as any,
      okRes
    );
    expect(service.resolveTeamHealthMessageWithDeadlineOverrideForStaff).toHaveBeenCalledWith(
      7,
      3,
      2,
      11,
      expect.objectContaining({
        taskDueDate: new Date("2026-03-15T12:00:00.000Z"),
      }),
      {
        inputMode: "SHIFT_DAYS",
        shiftDays: { taskDueDate: 3 },
      }
    );
    expect(okRes.json).toHaveBeenCalledWith({
      request: { id: 11, resolved: true },
      deadline: { taskDueDate: "2026-03-15T12:00:00.000Z" },
    });
  });

  it("resolveStaffTeamHealthMessageHandler maps invalid deadline override to 400", async () => {
    const res = mockResponse();
    (service.resolveTeamHealthMessageWithDeadlineOverrideForStaff as any).mockRejectedValueOnce(
      new (service as any).InvalidDeadlineOverrideError("taskDueDate")
    );

    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: {
          userId: 7,
          taskDueDate: "2026-03-15T12:00:00.000Z",
        },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "taskDueDate cannot be earlier than the current deadline",
    });
  });

  it("resolveStaffTeamHealthMessageHandler maps duplicate resolved team health conflict to 409", async () => {
    const res = mockResponse();
    (service.resolveTeamHealthMessageWithDeadlineOverrideForStaff as any).mockRejectedValueOnce(
      new (service as any).ResolvedTeamHealthMessageAlreadyExistsError()
    );

    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: {
          userId: 7,
          taskDueDate: "2026-03-15T12:00:00.000Z",
        },
      } as any,
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "A resolved team health message already exists for this team. Edit that request instead.",
    });
  });
});
