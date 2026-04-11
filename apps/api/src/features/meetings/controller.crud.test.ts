import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  listMeetingsHandler,
  getMeetingHandler,
  createMeetingHandler,
  updateMeetingHandler,
  deleteMeetingHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  listMeetings: vi.fn(),
  fetchMeeting: vi.fn(),
  addMeeting: vi.fn(),
  editMeeting: vi.fn(),
  removeMeeting: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("listMeetingsHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid team id", async () => {
    const req: any = { params: { teamId: "abc" } };
    const res = mockResponse();
    await listMeetingsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns meetings on success", async () => {
    (service.listMeetings as any).mockResolvedValue([{ id: 1 }]);
    const req: any = { params: { teamId: "5" } };
    const res = mockResponse();
    await listMeetingsHandler(req, res);
    expect(service.listMeetings).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("returns 500 on error", async () => {
    (service.listMeetings as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { teamId: "5" } };
    const res = mockResponse();
    await listMeetingsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getMeetingHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" } };
    const res = mockResponse();
    await getMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when meeting not found", async () => {
    (service.fetchMeeting as any).mockResolvedValue(null);
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns meeting on success", async () => {
    (service.fetchMeeting as any).mockResolvedValue({ id: 1 });
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMeetingHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it("returns 500 on error", async () => {
    (service.fetchMeeting as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("createMeetingHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when required fields are missing", async () => {
    const req: any = { body: { title: "Team Meeting" } };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates meeting and returns 201", async () => {
    (service.addMeeting as any).mockResolvedValue({ id: 3 });
    const req: any = {
      body: { teamId: 1, organiserId: 1, title: "Team Meeting", date: "2026-03-01", participantIds: [1, 2] },
    };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(service.addMeeting).toHaveBeenCalledWith(expect.objectContaining({ participantIds: [1, 2] }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("treats non-array participantIds as undefined", async () => {
    (service.addMeeting as any).mockResolvedValue({ id: 3 });
    const req: any = {
      body: { teamId: 1, organiserId: 1, title: "Team Meeting", date: "2026-03-01", participantIds: "not-an-array" },
    };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(service.addMeeting).toHaveBeenCalledWith(expect.not.objectContaining({ participantIds: expect.anything() }));
  });

  it("returns 409 for TEAM_ARCHIVED error", async () => {
    (service.addMeeting as any).mockRejectedValue({ code: "TEAM_ARCHIVED" });
    const req: any = {
      body: { teamId: 1, organiserId: 1, title: "Team Meeting", date: "2026-03-01" },
    };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 500 on error", async () => {
    (service.addMeeting as any).mockRejectedValue(new Error("fail"));
    const req: any = {
      body: { teamId: 1, organiserId: 1, title: "Team Meeting", date: "2026-03-01" },
    };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 409 when project is archived", async () => {
    (service.addMeeting as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = {
      body: { teamId: 1, organiserId: 1, title: "Team Meeting", date: "2026-03-01" },
    };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 409 when project is completed", async () => {
    (service.addMeeting as any).mockRejectedValue({ code: "PROJECT_COMPLETED" });
    const req: any = {
      body: { teamId: 1, organiserId: 1, title: "Team Meeting", date: "2026-03-01" },
    };
    const res = mockResponse();
    await createMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "This project is completed. Meeting creation is closed.",
    });
  });
});

describe("updateMeetingHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" }, body: { userId: 1 } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when userId is missing", async () => {
    const req: any = { params: { meetingId: "1" }, body: {} };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns updated meeting on success", async () => {
    (service.editMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1, title: "Updated" } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(service.editMeeting).toHaveBeenCalledWith(1, 1, expect.objectContaining({ title: "Updated" }));
    expect(res.json).toHaveBeenCalledWith({ id: 1, title: "Updated" });
  });

  it("passes array participantIds to editMeeting", async () => {
    (service.editMeeting as any).mockResolvedValue({ id: 1 });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1, participantIds: [2, 3] } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(service.editMeeting).toHaveBeenCalledWith(1, 1, expect.objectContaining({ participantIds: [2, 3] }));
  });

  it("treats non-array participantIds as undefined in updateMeetingHandler", async () => {
    (service.editMeeting as any).mockResolvedValue({ id: 1 });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1, participantIds: "not-an-array" } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(service.editMeeting).toHaveBeenCalledWith(1, 1, expect.not.objectContaining({ participantIds: expect.anything() }));
  });

  it("returns 404 for NOT_FOUND error", async () => {
    (service.editMeeting as any).mockRejectedValue({ code: "NOT_FOUND" });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 for FORBIDDEN error", async () => {
    (service.editMeeting as any).mockRejectedValue({ code: "FORBIDDEN" });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 409 for MEETING_PASSED error", async () => {
    (service.editMeeting as any).mockRejectedValue({ code: "MEETING_PASSED" });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 409 when project is archived", async () => {
    (service.editMeeting as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 500 for other errors", async () => {
    (service.editMeeting as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await updateMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteMeetingHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" } };
    const res = mockResponse();
    await deleteMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns ok on success", async () => {
    (service.removeMeeting as any).mockResolvedValue(undefined);
    const req: any = { params: { meetingId: "7" } };
    const res = mockResponse();
    await deleteMeetingHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 404 for P2025 error", async () => {
    (service.removeMeeting as any).mockRejectedValue({ code: "P2025" });
    const req: any = { params: { meetingId: "7" } };
    const res = mockResponse();
    await deleteMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 409 when project is archived", async () => {
    (service.removeMeeting as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = { params: { meetingId: "7" } };
    const res = mockResponse();
    await deleteMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 500 for other errors", async () => {
    (service.removeMeeting as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { meetingId: "7" } };
    const res = mockResponse();
    await deleteMeetingHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
