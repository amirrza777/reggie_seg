import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "../service.js";
import { markAttendanceHandler } from "../controller.js";

vi.mock("../service.js", () => ({
  markAttendance: vi.fn(),
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

  it("returns 409 when project is archived", async () => {
    (service.markAttendance as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = {
      params: { meetingId: "1" },
      body: { records: [{ userId: 1, status: "Present" }] },
    };
    const res = mockResponse();
    await markAttendanceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 404 when meeting not found", async () => {
    (service.markAttendance as any).mockRejectedValue({ code: "NOT_FOUND" });
    const req: any = {
      params: { meetingId: "1" },
      body: { records: [{ userId: 1, status: "Present" }] },
    };
    const res = mockResponse();
    await markAttendanceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
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
