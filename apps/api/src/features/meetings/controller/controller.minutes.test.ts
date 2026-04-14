import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "../service.js";
import { saveMinutesHandler, getMinutesHandler } from "../controller.js";

vi.mock("../service.js", () => ({
  saveMinutes: vi.fn(),
  fetchMeeting: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

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

  it("returns 409 when project is archived", async () => {
    (service.saveMinutes as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = {
      params: { meetingId: "5" },
      body: { writerId: 1, content: "notes" },
    };
    const res = mockResponse();
    await saveMinutesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
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
