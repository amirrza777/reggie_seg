import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  updateTemplateHandler,
  deleteTemplateHandler,
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

  it("returns 400 for invalid question type and purpose combination", async () => {
    (service.updateTemplate as any).mockRejectedValue({
      statusCode: 400,
      message: "Customised allocation questionnaires cannot include text questions.",
    });

    const req: any = {
      params: { id: "1" },
      body: {
        templateName: "Name",
        purpose: "CUSTOMISED_ALLOCATION",
        questions: [{ id: 1, label: "Explain", type: "text" }],
      },
      user: { sub: 99 },
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Customised allocation questionnaires cannot include text questions.",
    });
  });

  it("returns default 400 message when update validation error has no message", async () => {
    (service.updateTemplate as any).mockRejectedValue({ statusCode: 400 });

    const req: any = {
      params: { id: "1" },
      body: { templateName: "Name", questions: [] },
      user: { sub: 99 },
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
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

  it("forwards purpose when update body includes it", async () => {
    (service.updateTemplate as any).mockResolvedValue(undefined);

    const req: any = {
      params: { id: "1" },
      body: {
        templateName: "Updated",
        questions: [{ id: 1, label: "Rate", type: "rating" }],
        purpose: "GENERAL_PURPOSE",
      },
      user: { sub: 99 },
    };
    const res = mockResponse();

    await updateTemplateHandler(req, res);

    expect(service.updateTemplate).toHaveBeenCalledWith(
      99,
      1,
      "Updated",
      [{ id: 1, label: "Rate", type: "rating" }],
      undefined,
      "GENERAL_PURPOSE",
    );
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
