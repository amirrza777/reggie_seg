import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  markAttendanceHandler,
  saveMinutesHandler,
  getMinutesHandler,
  addCommentHandler,
  deleteCommentHandler,
  getMeetingSettingsHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  listMeetings: vi.fn(),
  fetchMeeting: vi.fn(),
  addMeeting: vi.fn(),
  editMeeting: vi.fn(),
  removeMeeting: vi.fn(),
  markAttendance: vi.fn(),
  saveMinutes: vi.fn(),
  addComment: vi.fn(),
  removeComment: vi.fn(),
  fetchMeetingSettings: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("markAttendanceHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" }, body: {} };
    const res = mockResponse();
    await markAttendanceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when records is not a non-empty array", async () => {
    const req: any = { params: { meetingId: "1" }, body: { records: [] } };
    const res = mockResponse();
    await markAttendanceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns ok on success", async () => {
    (service.markAttendance as any).mockResolvedValue(undefined);
    const req: any = {
      params: { meetingId: "1" },
      body: { records: [{ userId: 1, status: "Present" }] },
    };
    const res = mockResponse();
    await markAttendanceHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 500 on error", async () => {
    (service.markAttendance as any).mockRejectedValue(new Error("fail"));
    const req: any = {
      params: { meetingId: "1" },
      body: { records: [{ userId: 1, status: "Present" }] },
    };
    const res = mockResponse();
    await markAttendanceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("saveMinutesHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" }, body: {} };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const req: any = { params: { meetingId: "1" }, body: { writerId: 1 } };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns minutes on success", async () => {
    (service.saveMinutes as any).mockResolvedValue({ id: 1, content: "notes" });
    const req: any = {
      params: { meetingId: "5" },
      body: { writerId: 1, content: "notes" },
    };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ id: 1, content: "notes" });
  });

  it("returns 404 when meeting not found", async () => {
    (service.saveMinutes as any).mockRejectedValue({ code: "NOT_FOUND" });
    const req: any = {
      params: { meetingId: "5" },
      body: { writerId: 1, content: "notes" },
    };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when writer is not the original writer", async () => {
    (service.saveMinutes as any).mockRejectedValue({ code: "FORBIDDEN" });
    const req: any = {
      params: { meetingId: "5" },
      body: { writerId: 2, content: "notes" },
    };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 500 on error", async () => {
    (service.saveMinutes as any).mockRejectedValue(new Error("fail"));
    const req: any = {
      params: { meetingId: "5" },
      body: { writerId: 1, content: "notes" },
    };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getMinutesHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" } };
    const res = mockResponse();
    await getMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when meeting has no minutes", async () => {
    (service.fetchMeeting as any).mockResolvedValue({ id: 1, minutes: null });
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 404 when meeting not found", async () => {
    (service.fetchMeeting as any).mockResolvedValue(null);
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns minutes on success", async () => {
    (service.fetchMeeting as any).mockResolvedValue({ id: 1, minutes: { content: "notes" } });
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMinutesHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ content: "notes" });
  });

  it("returns 500 on error", async () => {
    (service.fetchMeeting as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("addCommentHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" }, body: {} };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates comment and returns 201", async () => {
    (service.addComment as any).mockResolvedValue({ id: 10 });
    const req: any = {
      params: { meetingId: "5" },
      body: { userId: 1, content: "looks good" },
    };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 10 });
  });

  it("returns 500 on error", async () => {
    (service.addComment as any).mockRejectedValue(new Error("fail"));
    const req: any = {
      params: { meetingId: "5" },
      body: { userId: 1, content: "looks good" },
    };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteCommentHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid comment id", async () => {
    const req: any = { params: { commentId: "abc" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns ok on success", async () => {
    (service.removeComment as any).mockResolvedValue(undefined);
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 404 for P2025 error", async () => {
    (service.removeComment as any).mockRejectedValue({ code: "P2025" });
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 for other errors", async () => {
    (service.removeComment as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getMeetingSettingsHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" } };
    const res = mockResponse();
    await getMeetingSettingsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when meeting not found", async () => {
    (service.fetchMeetingSettings as any).mockResolvedValue(null);
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMeetingSettingsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns settings on success", async () => {
    (service.fetchMeetingSettings as any).mockResolvedValue({ absenceThreshold: 3, minutesEditWindowDays: 7 });
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMeetingSettingsHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ absenceThreshold: 3, minutesEditWindowDays: 7 });
  });

  it("returns 500 on error", async () => {
    (service.fetchMeetingSettings as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { meetingId: "1" } };
    const res = mockResponse();
    await getMeetingSettingsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
