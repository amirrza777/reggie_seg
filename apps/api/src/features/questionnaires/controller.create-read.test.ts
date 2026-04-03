import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import * as authService from "../../auth/service.js";
import * as service from "./service.js";
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
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

vi.mock("jsonwebtoken");
vi.mock("../../auth/service.js", () => ({
  verifyRefreshToken: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("createTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if body is invalid", async () => {
    const req: any = { body: {} };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 if user cannot be resolved", async () => {
    const req: any = {
      body: { templateName: "Test", questions: [] },
      headers: {},
      cookies: {},
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("creates template when user exists on req.user", async () => {
    (service.createTemplate as any).mockResolvedValue({ id: 123 });

    const req: any = {
      body: { templateName: "Test", questions: [], isPublic: false },
      user: { sub: 5 },
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(service.createTemplate).toHaveBeenCalledWith("Test", [], 5, false);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      templateID: 123,
      userId: 5,
      isPublic: false,
    });
  });

  it("falls back to access token if req.user is missing", async () => {
    (jwt.verify as any).mockReturnValue({ sub: 9 });
    (service.createTemplate as any).mockResolvedValue({ id: 77 });

    const req: any = {
      body: { templateName: "JWT", questions: [] },
      headers: { authorization: "Bearer token123" },
      cookies: {},
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(service.createTemplate).toHaveBeenCalledWith("JWT", [], 9, true);
  });

  it("accepts access token payload with email and forwards purpose", async () => {
    (jwt.verify as any).mockReturnValue({ sub: 9, email: "user@test.dev" });
    (service.createTemplate as any).mockResolvedValue({ id: 79 });

    const req: any = {
      body: { templateName: "Purpose", questions: [], purpose: "GENERAL_PURPOSE" },
      headers: { authorization: "Bearer token123" },
      cookies: {},
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(service.createTemplate).toHaveBeenCalledWith("Purpose", [], 9, true, "GENERAL_PURPOSE");
  });

  it("returns 401 when access token payload has invalid sub/email shape", async () => {
    (jwt.verify as any).mockReturnValue({ sub: "9", email: "" });
    const req: any = {
      body: { templateName: "JWT", questions: [] },
      headers: { authorization: "Bearer token123" },
      cookies: {},
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("falls back to refresh token if access token fails", async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw new Error("bad token");
    });
    (authService.verifyRefreshToken as any).mockReturnValue({ sub: 42 });
    (service.createTemplate as any).mockResolvedValue({ id: 88 });

    const req: any = {
      body: { templateName: "Refresh", questions: [] },
      headers: { authorization: "Bearer badtoken" },
      cookies: { refresh_token: "refresh123" },
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(service.createTemplate).toHaveBeenCalledWith("Refresh", [], 42, true);
  });

  it("returns 401 if refresh token resolves without sub", async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw new Error("invalid access");
    });
    (authService.verifyRefreshToken as any).mockReturnValue({});

    const req: any = {
      body: { templateName: "Test", questions: [] },
      headers: { authorization: "Bearer badtoken" },
      cookies: { refresh_token: "refresh123" },
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 if refresh token verification throws", async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw new Error("invalid access");
    });
    (authService.verifyRefreshToken as any).mockImplementation(() => {
      throw new Error("invalid refresh");
    });

    const req: any = {
      body: { templateName: "Test", questions: [] },
      headers: { authorization: "Bearer badtoken" },
      cookies: { refresh_token: "badrefresh" },
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 500 if createTemplate throws", async () => {
    (service.createTemplate as any).mockRejectedValue(new Error("db failure"));

    const req: any = {
      body: { templateName: "Fail", questions: [] },
      user: { sub: 10 },
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 400 when service rejects invalid question type for purpose", async () => {
    (service.createTemplate as any).mockRejectedValue(
      Object.assign(new Error("Customised allocation questionnaires cannot include text questions."), {
        statusCode: 400,
      }),
    );

    const req: any = {
      body: {
        templateName: "Allocation",
        purpose: "CUSTOMISED_ALLOCATION",
        questions: [{ label: "Explain", type: "text" }],
      },
      user: { sub: 10 },
    };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Customised allocation questionnaires cannot include text questions.",
    });
  });
});

describe("getTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if id is invalid", async () => {
    const req: any = { params: { id: "abc" } };
    const res = mockResponse();

    await getTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if template not found", async () => {
    (service.getTemplate as any).mockResolvedValue(null);

    const req: any = { params: { id: "1" } };
    const res = mockResponse();

    await getTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns template when found", async () => {
    (service.getTemplate as any).mockResolvedValue({ id: 1 });

    const req: any = { params: { id: "1" } };
    const res = mockResponse();

    await getTemplateHandler(req, res);

    expect(service.getTemplate).toHaveBeenCalledWith(1, null);
    expect(res.json).toHaveBeenCalledWith({ id: 1, canEdit: false });
  });

  it("sets canEdit=true when requester owns template", async () => {
    (service.getTemplate as any).mockResolvedValue({ id: 2, ownerId: 7 });

    const req: any = { params: { id: "2" }, user: { sub: 7 } };
    const res = mockResponse();

    await getTemplateHandler(req, res);

    expect(service.getTemplate).toHaveBeenCalledWith(2, 7);
    expect(res.json).toHaveBeenCalledWith({ id: 2, ownerId: 7, canEdit: true });
  });
});

describe("getAllTemplatesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all templates", async () => {
    (service.getAllTemplates as any).mockResolvedValue([{ id: 1 }]);

    const req: any = {};
    const res = mockResponse();

    await getAllTemplatesHandler(req, res);

    expect(service.getAllTemplates).toHaveBeenCalledWith(null);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("returns 500 on error", async () => {
    (service.getAllTemplates as any).mockRejectedValue(new Error("fail"));

    const req: any = {};
    const res = mockResponse();

    await getAllTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
