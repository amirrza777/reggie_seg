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

  it("getStaffTeamDeadlineHandler returns 404 and 500 branches", async () => {
    (service.fetchTeamDeadlineForStaff as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await getStaffTeamDeadlineHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      notFoundRes
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (service.fetchTeamDeadlineForStaff as any).mockRejectedValueOnce(new Error("boom"));
    const errorRes = mockResponse();
    await getStaffTeamDeadlineHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      errorRes
    );
    expect(errorRes.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
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

  it("reviewStaffTeamHealthMessageHandler validates ids and response text type", async () => {
    const idRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "x", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: false },
      } as any,
      idRes
    );
    expect(idRes.status).toHaveBeenCalledWith(400);

    const responseTypeRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: false, responseText: 42 },
      } as any,
      responseTypeRes
    );
    expect(responseTypeRes.status).toHaveBeenCalledWith(400);
  });

  it("reviewStaffTeamHealthMessageHandler trims response and handles 404/500", async () => {
    (service.reviewTeamHealthMessageForStaff as any).mockResolvedValueOnce({ id: 11, resolved: true });
    const resolvedRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: true, responseText: "  done  " },
      } as any,
      resolvedRes
    );
    expect(service.reviewTeamHealthMessageForStaff).toHaveBeenLastCalledWith(7, 3, 2, 11, true, "done");

    (service.reviewTeamHealthMessageForStaff as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: false },
      } as any,
      notFoundRes
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (service.reviewTeamHealthMessageForStaff as any).mockRejectedValueOnce(new Error("boom"));
    const errorRes = mockResponse();
    await reviewStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, resolved: false },
      } as any,
      errorRes
    );
    expect(errorRes.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
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

  it("resolveStaffTeamHealthMessageHandler validates ids, mode, shiftDays and not-found", async () => {
    const idRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "x", teamId: "2", requestId: "11" },
        body: { userId: 7 },
      } as any,
      idRes
    );
    expect(idRes.status).toHaveBeenCalledWith(400);

    const invalidModeRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, deadlineInputMode: "INVALID" },
      } as any,
      invalidModeRes
    );
    expect(invalidModeRes.status).toHaveBeenCalledWith(400);

    const invalidShiftObjectRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, shiftDays: "bad" },
      } as any,
      invalidShiftObjectRes
    );
    expect(invalidShiftObjectRes.status).toHaveBeenCalledWith(400);

    const invalidShiftValueRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, shiftDays: { feedbackDueDate: -1 } },
      } as any,
      invalidShiftValueRes
    );
    expect(invalidShiftValueRes.status).toHaveBeenCalledWith(400);

    (service.resolveTeamHealthMessageWithDeadlineOverrideForStaff as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7 },
      } as any,
      notFoundRes
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it("resolveStaffTeamHealthMessageHandler validates date field types and null/empty support", async () => {
    const nonStringRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, taskOpenDate: 123 },
      } as any,
      nonStringRes
    );
    expect(nonStringRes.status).toHaveBeenCalledWith(400);

    (service.resolveTeamHealthMessageWithDeadlineOverrideForStaff as any).mockResolvedValueOnce({
      request: { id: 11, resolved: true },
      deadline: {},
    });
    const nullableRes = mockResponse();
    await resolveStaffTeamHealthMessageHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: {
          userId: 7,
          taskOpenDate: "",
          taskDueDate: null,
          assessmentOpenDate: "",
          assessmentDueDate: null,
          feedbackOpenDate: "",
          feedbackDueDate: null,
          deadlineInputMode: "SELECT_DATE",
          shiftDays: {},
        },
      } as any,
      nullableRes
    );
    expect(service.resolveTeamHealthMessageWithDeadlineOverrideForStaff).toHaveBeenCalledWith(
      7,
      3,
      2,
      11,
      expect.objectContaining({
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
      }),
      {
        inputMode: "SELECT_DATE",
        shiftDays: {},
      }
    );
  });

  it("resolveStaffTeamHealthMessageHandler validates later date fields individually", async () => {
    const cases: Array<{
      field: "assessmentOpenDate" | "assessmentDueDate" | "feedbackOpenDate" | "feedbackDueDate";
    }> = [
      { field: "assessmentOpenDate" },
      { field: "assessmentDueDate" },
      { field: "feedbackOpenDate" },
      { field: "feedbackDueDate" },
    ];

    for (const { field } of cases) {
      const res = mockResponse();
      await resolveStaffTeamHealthMessageHandler(
        {
          params: { projectId: "3", teamId: "2", requestId: "11" },
          body: {
            userId: 7,
            taskOpenDate: "2026-03-11T00:00:00.000Z",
            taskDueDate: "2026-03-12T00:00:00.000Z",
            [field]: "not-a-date",
          },
        } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
    }
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

  it("resolveStaffTeamHealthMessageHandler maps unknown errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mockResponse();
    (service.resolveTeamHealthMessageWithDeadlineOverrideForStaff as any).mockRejectedValueOnce(new Error("boom"));

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

    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});
