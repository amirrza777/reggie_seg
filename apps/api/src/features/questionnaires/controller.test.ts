import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./controller.js";
import * as service from "./service.js";
import * as authService from "../../auth/service.js";
import jwt from "jsonwebtoken";

//mock service layer
vi.mock("./service.js", () => ({
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  getAllTemplates: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

//mock auth helpers
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

//creating a template

describe("createTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if body is invalid", async () => {
    const req: any = { body: {} };
    const res = mockResponse();

    await createTemplateHandler(req, res);

    //missing templateName or questions
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

    //No auth info provided
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

    //Should use req.user.sub
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

    //Tests extracting user from JWT
    expect(service.createTemplate).toHaveBeenCalledWith("JWT", [], 9, true);
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

    //should use refresh token
    expect(service.createTemplate).toHaveBeenCalledWith("Refresh", [], 42, true);
  });

  it("returns 401 if refresh token resolves without sub", async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw new Error("invalid access");
    });

    //Payload exists but no sub
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

  it("returns 500 if createTemplate throws", async () => {
    (service.createTemplate as any).mockRejectedValue(new Error("db failure"));

    const req: any = {
      body: { templateName: "Fail", questions: [] },
      user: { sub: 10 },
    };

    const res = mockResponse();

    await createTemplateHandler(req, res);

    //Service failure should hit catch block
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//Tests getting template

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
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});

//tests getting all templates

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

// tests updating a template

describe("updateTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid id", async () => {
    const req: any = { params: { id: "abc" }, body: {} };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid body", async () => {
    const req: any = {
      params: { id: "1" },
      body: { templateName: "", questions: "not-an-array" },
    };

    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if prisma P2025 error", async () => {
    (service.updateTemplate as any).mockRejectedValue({ code: "P2025" });

    const req: any = {
      params: { id: "1" },
      body: { templateName: "Name", questions: [] },
    };

    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 for non-P2025 error", async () => {
    (service.updateTemplate as any).mockRejectedValue(new Error("random"));

    const req: any = {
      params: { id: "1" },
      body: { templateName: "Name", questions: [] },
    };

    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns ok when update succeeds", async () => {
    (service.updateTemplate as any).mockResolvedValue(undefined);

    const req: any = {
      params: { id: "1" },
      body: { templateName: "Updated", questions: [] },
    };

    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(service.updateTemplate).toHaveBeenCalledWith(1, "Updated", [], undefined);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

// testing deleting a template
describe("deleteTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid id", async () => {
    const req: any = { params: { id: "abc" } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if prisma P2025 error", async () => {
    (service.deleteTemplate as any).mockRejectedValue({ code: "P2025" });

    const req: any = { params: { id: "1" } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 for non-P2025 error", async () => {
    (service.deleteTemplate as any).mockRejectedValue({
      code: "SOME_OTHER_ERROR",
    });

    const req: any = { params: { id: "1" } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
  });

  it("returns ok when delete succeeds", async () => {
    (service.deleteTemplate as any).mockResolvedValue(undefined);

    const req: any = { params: { id: "1" } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
