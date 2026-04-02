import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import { getMeetingSettingsHandler } from "./controller.js";

vi.mock("./service.js", () => ({
  fetchMeetingSettings: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

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
