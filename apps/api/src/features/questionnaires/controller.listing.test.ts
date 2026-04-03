import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  getMyTemplatesHandler,
  getPublicTemplatesFromOtherUsersHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  getAllTemplates: vi.fn(),
  getMyTemplates: vi.fn(),
  getPublicTemplatesFromOtherUsers: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  usePublicTemplate: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("getMyTemplatesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = { headers: {}, cookies: {} };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.getMyTemplates).not.toHaveBeenCalled();
  });

  it("returns requester templates when authenticated", async () => {
    (service.getMyTemplates as any).mockResolvedValue([{ id: 10 }]);

    const req: any = { user: { sub: 55 } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(service.getMyTemplates).toHaveBeenCalledWith(55);
    expect(res.json).toHaveBeenCalledWith([{ id: 10 }]);
  });

  it("passes query and purpose filters to my templates", async () => {
    (service.getMyTemplates as any).mockResolvedValue([{ id: 10 }]);

    const req: any = { user: { sub: 55 }, query: { q: "  teamwork ", purpose: "PEER_ASSESSMENT" } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(service.getMyTemplates).toHaveBeenCalledWith(55, {
      query: "teamwork",
      purpose: "PEER_ASSESSMENT",
    });
  });

  it("returns 400 for invalid purpose on my templates listing", async () => {
    const req: any = { user: { sub: 55 }, query: { purpose: "INVALID" } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid search query on my templates listing", async () => {
    const req: any = { user: { sub: 55 }, query: { q: ["bad"] } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 for non-auth errors", async () => {
    (service.getMyTemplates as any).mockRejectedValue(new Error("db fail"));

    const req: any = { user: { sub: 55 } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getPublicTemplatesFromOtherUsersHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = { headers: {}, cookies: {} };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.getPublicTemplatesFromOtherUsers).not.toHaveBeenCalled();
  });

  it("returns public templates from others when authenticated", async () => {
    (service.getPublicTemplatesFromOtherUsers as any).mockResolvedValue([{ id: 11 }]);

    const req: any = { user: { sub: 77 } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(service.getPublicTemplatesFromOtherUsers).toHaveBeenCalledWith(77);
    expect(res.json).toHaveBeenCalledWith([{ id: 11 }]);
  });

  it("passes purpose filter to public templates listing", async () => {
    (service.getPublicTemplatesFromOtherUsers as any).mockResolvedValue([{ id: 11 }]);

    const req: any = { user: { sub: 77 }, query: { purpose: "GENERAL_PURPOSE" } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(service.getPublicTemplatesFromOtherUsers).toHaveBeenCalledWith(77, {
      purpose: "GENERAL_PURPOSE",
    });
  });

  it("returns 400 for invalid purpose on public templates listing", async () => {
    const req: any = { user: { sub: 77 }, query: { purpose: "INVALID" } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 for non-auth errors", async () => {
    (service.getPublicTemplatesFromOtherUsers as any).mockRejectedValue(new Error("db fail"));

    const req: any = { user: { sub: 77 } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
