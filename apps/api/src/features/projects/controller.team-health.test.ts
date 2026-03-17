import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  createTeamHealthMessageHandler,
  getMyTeamHealthMessagesHandler,
  getStaffTeamHealthMessagesHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  createProject: vi.fn(),
  fetchProjectById: vi.fn(),
  fetchProjectMarking: vi.fn(),
  fetchProjectTeamsForStaff: vi.fn(),
  fetchProjectsForUser: vi.fn(),
  fetchProjectsForStaff: vi.fn(),
  fetchModulesForUser: vi.fn(),
  fetchProjectDeadline: vi.fn(),
  fetchTeammatesForProject: vi.fn(),
  fetchTeamById: vi.fn(),
  fetchTeamByUserAndProject: vi.fn(),
  fetchQuestionsForProject: vi.fn(),
  submitTeamHealthMessage: vi.fn(),
  fetchMyTeamHealthMessages: vi.fn(),
  fetchTeamHealthMessagesForStaff: vi.fn(),
  updateTeamDeadlineProfileForStaff: vi.fn(),
  fetchStaffStudentDeadlineOverrides: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("projects controller team health handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamHealthMessageHandler validates payload and creates request", async () => {
    const badRes = mockResponse();
    await createTeamHealthMessageHandler({ params: { projectId: "x" }, body: { userId: 1 } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    const badBodyRes = mockResponse();
    await createTeamHealthMessageHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: " ", details: "detail" } } as any,
      badBodyRes,
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    (service.submitTeamHealthMessage as any).mockResolvedValue({
      id: 11,
      projectId: 2,
      teamId: 3,
      requesterUserId: 7,
      subject: "Need support",
      details: "Please review team dynamics",
      resolved: false,
    });
    const okRes = mockResponse();
    await createTeamHealthMessageHandler(
      {
        params: { projectId: "2" },
        body: { userId: 7, subject: " Need support ", details: " Please review team dynamics " },
      } as any,
      okRes,
    );
    expect(service.submitTeamHealthMessage).toHaveBeenCalledWith(7, 2, "Need support", "Please review team dynamics");
    expect(okRes.status).toHaveBeenCalledWith(201);
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ id: 11, resolved: false }),
      }),
    );

    (service.submitTeamHealthMessage as any).mockResolvedValue(null);
    const missingRes = mockResponse();
    await createTeamHealthMessageHandler(
      { params: { projectId: "2" }, body: { userId: 7, subject: "Need", details: "Help" } } as any,
      missingRes,
    );
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("getMyTeamHealthMessagesHandler validates ids and returns requester list", async () => {
    const badRes = mockResponse();
    await getMyTeamHealthMessagesHandler({ params: { projectId: "x" }, query: { userId: "7" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchMyTeamHealthMessages as any).mockResolvedValue([
      { id: 1, subject: "Need support", resolved: false },
    ]);
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

    (service.fetchTeamHealthMessagesForStaff as any).mockResolvedValue([
      { id: 4, subject: "Urgent", resolved: false },
    ]);
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
