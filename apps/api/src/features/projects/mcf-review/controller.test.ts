import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  getStaffTeamDeadlineHandler,
  resolveStaffTeamMcfRequestHandler,
  reviewStaffTeamMcfRequestHandler,
} from "./controller.js";
import * as service from "./service.js";

vi.mock("./service.js", () => ({
  InvalidDeadlineOverrideError: class InvalidDeadlineOverrideError extends Error {
    constructor(field: string) {
      super(`${field} cannot be earlier than the current deadline`);
    }
  },
  ResolvedMcfAlreadyExistsError: class ResolvedMcfAlreadyExistsError extends Error {
    constructor() {
      super("A resolved MCF request already exists for this team. Edit that request instead.");
    }
  },
  fetchTeamDeadlineForStaff: vi.fn(),
  reviewTeamMcfRequestForStaff: vi.fn(),
  resolveTeamMcfRequestWithDeadlineOverrideForStaff: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("mcf-review controller", () => {
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

  it("reviewStaffTeamMcfRequestHandler validates status and delegates", async () => {
    const badRes = mockResponse();
    await reviewStaffTeamMcfRequestHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, status: "OPEN" },
      } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.reviewTeamMcfRequestForStaff as any).mockResolvedValueOnce({ id: 11, status: "REJECTED" });
    const okRes = mockResponse();
    await reviewStaffTeamMcfRequestHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, status: "REJECTED" },
      } as any,
      okRes
    );
    expect(service.reviewTeamMcfRequestForStaff).toHaveBeenCalledWith(7, 3, 2, 11, "REJECTED");
    expect(okRes.json).toHaveBeenCalledWith({ request: { id: 11, status: "REJECTED" } });
  });

  it("resolveStaffTeamMcfRequestHandler validates dates and delegates", async () => {
    const badRes = mockResponse();
    await resolveStaffTeamMcfRequestHandler(
      {
        params: { projectId: "3", teamId: "2", requestId: "11" },
        body: { userId: 7, taskDueDate: "not-a-date" },
      } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.resolveTeamMcfRequestWithDeadlineOverrideForStaff as any).mockResolvedValueOnce({
      request: { id: 11, status: "RESOLVED" },
      deadline: { taskDueDate: "2026-03-15T12:00:00.000Z" },
    });
    const okRes = mockResponse();
    await resolveStaffTeamMcfRequestHandler(
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
    expect(service.resolveTeamMcfRequestWithDeadlineOverrideForStaff).toHaveBeenCalledWith(
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
      request: { id: 11, status: "RESOLVED" },
      deadline: { taskDueDate: "2026-03-15T12:00:00.000Z" },
    });
  });

  it("resolveStaffTeamMcfRequestHandler maps invalid deadline override to 400", async () => {
    const res = mockResponse();
    (service.resolveTeamMcfRequestWithDeadlineOverrideForStaff as any).mockRejectedValueOnce(
      new (service as any).InvalidDeadlineOverrideError("taskDueDate")
    );

    await resolveStaffTeamMcfRequestHandler(
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

  it("resolveStaffTeamMcfRequestHandler maps duplicate resolved MCF conflict to 409", async () => {
    const res = mockResponse();
    (service.resolveTeamMcfRequestWithDeadlineOverrideForStaff as any).mockRejectedValueOnce(
      new (service as any).ResolvedMcfAlreadyExistsError()
    );

    await resolveStaffTeamMcfRequestHandler(
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
      error: "A resolved MCF request already exists for this team. Edit that request instead.",
    });
  });
});
