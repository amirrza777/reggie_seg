import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  getStaffTeamDeadlineHandler,
  resolveStaffTeamMcfRequestHandler,
  reviewStaffTeamMcfRequestHandler,
} from "./controller.js";
import * as service from "./service.js";

vi.mock("./service.js", () => ({
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

    (service.fetchTeamDeadlineForStaff as any).mockResolvedValueOnce({ taskDueDate: "2026-03-12" });
    const okRes = mockResponse();
    await getStaffTeamDeadlineHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      okRes
    );
    expect(service.fetchTeamDeadlineForStaff).toHaveBeenCalledWith(7, 3, 2);
    expect(okRes.json).toHaveBeenCalledWith({ deadline: { taskDueDate: "2026-03-12" } });
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
      })
    );
    expect(okRes.json).toHaveBeenCalledWith({
      request: { id: 11, status: "RESOLVED" },
      deadline: { taskDueDate: "2026-03-15T12:00:00.000Z" },
    });
  });
});
