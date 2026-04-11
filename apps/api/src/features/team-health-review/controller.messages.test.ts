import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  createTeamHealthMessageHandler,
  getMyTeamHealthMessagesHandler,
  getStaffTeamHealthMessagesHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  fetchTeamDeadlineForStaff: vi.fn(),
  reviewTeamHealthMessageForStaff: vi.fn(),
  resolveTeamHealthMessageWithDeadlineOverrideForStaff: vi.fn(),
  submitTeamHealthMessage: vi.fn(),
  fetchMyTeamHealthMessages: vi.fn(),
  fetchTeamHealthMessagesForStaff: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("team-health-review message controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamHealthMessageHandler validates project id", async () => {
    const res = mockResponse();
    await createTeamHealthMessageHandler({ params: { projectId: "x" }, body: { userId: 1 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createTeamHealthMessageHandler validates message payload", async () => {
    const res = mockResponse();
    await createTeamHealthMessageHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: " ", details: "detail" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createTeamHealthMessageHandler creates a request when payload is valid", async () => {
    (service.submitTeamHealthMessage as any).mockResolvedValue({
      id: 11,
      projectId: 2,
      teamId: 3,
      requesterUserId: 7,
      subject: "Need support",
      details: "Please review team dynamics",
      resolved: false,
    });
    const res = mockResponse();
    await createTeamHealthMessageHandler(
      {
        params: { projectId: "2" },
        body: { userId: 7, subject: " Need support ", details: " Please review team dynamics " },
      } as any,
      res,
    );
    expect(service.submitTeamHealthMessage).toHaveBeenCalledWith(7, 2, "Need support", "Please review team dynamics");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ id: 11, resolved: false }),
      }),
    );
  });

  it("createTeamHealthMessageHandler returns 404 when project/team membership is missing", async () => {
    (service.submitTeamHealthMessage as any).mockResolvedValue(null);
    const res = mockResponse();
    await createTeamHealthMessageHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: "Need", details: "Help" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getMyTeamHealthMessagesHandler validates ids and returns requester list", async () => {
    const badRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "x" }, query: { userId: "7" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchMyTeamHealthMessages as any).mockResolvedValue([{ id: 1, subject: "Need support", resolved: false }]);
    const okRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "3" }, query: { userId: "7" } } as any, okRes);
    expect(service.fetchMyTeamHealthMessages).toHaveBeenCalledWith(7, 3);
    expect(okRes.json).toHaveBeenCalledWith({
      requests: [{ id: 1, subject: "Need support", resolved: false }],
    });

    (service.fetchMyTeamHealthMessages as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "3" }, query: { userId: "7" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getStaffTeamHealthMessagesHandler validates ids and returns staff list", async () => {
    const badRes = mockResponse();
    await getStaffTeamHealthMessagesHandler(
      { params: { projectId: "x", teamId: "2" }, query: { userId: "7" } } as any,
      badRes,
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamHealthMessagesForStaff as any).mockResolvedValue([{ id: 4, subject: "Urgent", resolved: false }]);
    const okRes = mockResponse();
    await getStaffTeamHealthMessagesHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      okRes,
    );
    expect(service.fetchTeamHealthMessagesForStaff).toHaveBeenCalledWith(7, 3, 2);
    expect(okRes.json).toHaveBeenCalledWith({
      requests: [{ id: 4, subject: "Urgent", resolved: false }],
    });

    (service.fetchTeamHealthMessagesForStaff as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await getStaffTeamHealthMessagesHandler(
      { params: { projectId: "3", teamId: "2" }, query: { userId: "7" } } as any,
      missingRes,
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });
});
