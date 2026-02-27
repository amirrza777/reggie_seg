import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import * as authService from "../../auth/service.js";
import * as service from "./service.js";
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
  getMyTemplatesHandler,
  getPublicTemplatesFromOtherUsersHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  useTemplateHandler,
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

  it("returns 500 for non-auth errors", async () => {
    (service.getPublicTemplatesFromOtherUsers as any).mockRejectedValue(new Error("db fail"));

    const req: any = { user: { sub: 77 } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

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
      user: { sub: 99 },
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = {
      params: { id: "1" },
      body: { templateName: "Name", questions: [] },
      headers: {},
      cookies: {},
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.updateTemplate).not.toHaveBeenCalled();
  });

  it("returns 403 when update is forbidden", async () => {
    (service.updateTemplate as any).mockRejectedValue({ statusCode: 403 });

    const req: any = {
      params: { id: "1" },
      body: { templateName: "Name", questions: [] },
      user: { sub: 99 },
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 500 for non-P2025 error", async () => {
    (service.updateTemplate as any).mockRejectedValue(new Error("random"));

    const req: any = {
      params: { id: "1" },
      body: { templateName: "Name", questions: [] },
      user: { sub: 99 },
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
      user: { sub: 99 },
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(service.updateTemplate).toHaveBeenCalledWith(99, 1, "Updated", [], undefined);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

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

  it("returns 401 when requester is missing", async () => {
    const req: any = { params: { id: "1" }, headers: {}, cookies: {} };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.deleteTemplate).not.toHaveBeenCalled();
  });

  it("returns 403 when delete is forbidden", async () => {
    (service.deleteTemplate as any).mockRejectedValue({ statusCode: 403 });

    const req: any = { params: { id: "1" }, user: { sub: 99 } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 if prisma P2025 error", async () => {
    (service.deleteTemplate as any).mockRejectedValue({ code: "P2025" });

    const req: any = { params: { id: "1" }, user: { sub: 99 } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 409 when template is in use", async () => {
    (service.deleteTemplate as any).mockRejectedValue({ code: "TEMPLATE_IN_USE" });

    const req: any = { params: { id: "1" }, user: { sub: 99 } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Questionnaire template is currently in use and cannot be deleted",
    });
  });

  it("returns 409 when prisma P2003 foreign key conflict occurs", async () => {
    (service.deleteTemplate as any).mockRejectedValue({ code: "P2003" });

    const req: any = { params: { id: "1" }, user: { sub: 99 } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Questionnaire template is currently in use and cannot be deleted",
    });
  });

  it("returns 500 for non-P2025 error", async () => {
    (service.deleteTemplate as any).mockRejectedValue({
      code: "SOME_OTHER_ERROR",
    });

    const req: any = { params: { id: "1" }, user: { sub: 99 } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
  });

  it("returns ok when delete succeeds", async () => {
    (service.deleteTemplate as any).mockResolvedValue(undefined);

    const req: any = { params: { id: "1" }, user: { sub: 99 } };
    const res = mockResponse();

    await deleteTemplateHandler(req, res);

    expect(service.deleteTemplate).toHaveBeenCalledWith(99, 1);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

describe("useTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid id", async () => {
    const req: any = { params: { id: "abc" } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = { params: { id: "1" }, headers: {}, cookies: {} };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.usePublicTemplate).not.toHaveBeenCalled();
  });

  it("returns 404 when source public template is not found", async () => {
    (service.usePublicTemplate as any).mockResolvedValue(null);

    const req: any = { params: { id: "2" }, user: { sub: 3 } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(service.usePublicTemplate).toHaveBeenCalledWith(3, 2);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns ok with copied template id", async () => {
    (service.usePublicTemplate as any).mockResolvedValue({ id: 99 });

    const req: any = { params: { id: "2" }, user: { sub: 3 } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(service.usePublicTemplate).toHaveBeenCalledWith(3, 2);
    expect(res.json).toHaveBeenCalledWith({ ok: true, templateID: 99 });
  });

  it("returns 500 for non-auth errors", async () => {
    (service.usePublicTemplate as any).mockRejectedValue(new Error("boom"));

    const req: any = { params: { id: "2" }, user: { sub: 3 } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
