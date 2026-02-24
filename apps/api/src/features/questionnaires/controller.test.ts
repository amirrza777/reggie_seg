import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./controller.js";

import * as service from "./service.js"; // TODO finish changing comments plus also check if ID is configged to only use 1 

//Mocks service layer
vi.mock("./service.js", () => ({
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  getAllTemplates: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

// small reusable mock response object
function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("QuestionnaireTemplate controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // create

  it("creates template when request body is valid", async () => {
    (service.createTemplate as any).mockResolvedValue({ id: 5 });

    const req: any = {
      body: {
        templateName: "Template A",
        questions: [{ label: "Q1", type: "text" }],
      },
      user: { sub: 10 },
    };

    const res = createMockRes();

    await createTemplateHandler(req, res);

    // ensures service is called with correct values
    expect(service.createTemplate).toHaveBeenCalledWith(
      "Template A",
      req.body.questions,
      10
    );

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      templateID: 5,
      userId: 10,
    });
  });

  it("returns 401 if no authenticated user can be resolved", async () => {
    const req: any = {
      body: {
        templateName: "Template A",
        questions: [],
      },
      headers: {},
      cookies: {},
    };

    const res = createMockRes();

    await createTemplateHandler(req, res);

    expect(service.createTemplate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 if request body is invalid", async () => {
    const req: any = {
      body: { templateName: "", questions: "not-array" },
    };

    const res = createMockRes();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 if service throws during create", async () => {
    (service.createTemplate as any).mockRejectedValue(new Error("fail"));

    const req: any = {
      body: { templateName: "A", questions: [] },
      user: { sub: 1 },
    };

    const res = createMockRes();

    await createTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // get by id

  it("returns template when found", async () => {
    (service.getTemplate as any).mockResolvedValue({ id: 2 });

    const req: any = { params: { id: "2" } };
    const res = createMockRes();

    await getTemplateHandler(req, res);

    expect(service.getTemplate).toHaveBeenCalledWith(2);
    expect(res.json).toHaveBeenCalledWith({ id: 2 });
  });

  it("returns 400 if template id is invalid", async () => {
    const req: any = { params: { id: "abc" } };
    const res = createMockRes();

    await getTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if template not found", async () => {
    (service.getTemplate as any).mockResolvedValue(null);

    const req: any = { params: { id: "5" } };
    const res = createMockRes();

    await getTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // get all

  it("returns all templates", async () => {
    (service.getAllTemplates as any).mockResolvedValue([{ id: 1 }]);

    const req: any = {};
    const res = createMockRes();

    await getAllTemplatesHandler(req, res);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("returns 500 if getAll fails", async () => {
    (service.getAllTemplates as any).mockRejectedValue(new Error("fail"));

    const req: any = {};
    const res = createMockRes();

    await getAllTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // update

  it("updates template when request is valid", async () => {
    (service.updateTemplate as any).mockResolvedValue(undefined);

    const req: any = {
      params: { id: "3" },
      body: { templateName: "Updated", questions: [] },
    };

    const res = createMockRes();

    await updateTemplateHandler(req, res);

    expect(service.updateTemplate).toHaveBeenCalledWith(
      3,
      "Updated",
      []
    );

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 400 if update id is invalid", async () => {
    const req: any = {
      params: { id: "abc" },
      body: { templateName: "X", questions: [] },
    };

    const res = createMockRes();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 if update body is invalid", async () => {
    const req: any = {
      params: { id: "1" },
      body: { templateName: "", questions: "bad" },
    };

    const res = createMockRes();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if prisma P2025 error occurs", async () => {
    (service.updateTemplate as any).mockRejectedValue({ code: "P2025" });

    const req: any = {
      params: { id: "1" },
      body: { templateName: "X", questions: [] },
    };

    const res = createMockRes();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 for unexpected update errors", async () => {
    (service.updateTemplate as any).mockRejectedValue(new Error("fail"));

    const req: any = {
      params: { id: "1" },
      body: { templateName: "X", questions: [] },
    };

    const res = createMockRes();

    await updateTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // delete

  it("deletes template successfully", async () => {
    (service.deleteTemplate as any).mockResolvedValue(undefined);

    const req: any = { params: { id: "7" } };
    const res = createMockRes();

    await deleteTemplateHandler(req, res);

    expect(service.deleteTemplate).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 400 if delete id is invalid", async () => {
    const req: any = { params: { id: "abc" } };
    const res = createMockRes();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if prisma P2025 during delete", async () => {
    (service.deleteTemplate as any).mockRejectedValue({ code: "P2025" });

    const req: any = { params: { id: "3" } };
    const res = createMockRes();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 for unexpected delete errors", async () => {
    (service.deleteTemplate as any).mockRejectedValue(new Error("fail"));

    const req: any = { params: { id: "3" } };
    const res = createMockRes();

    await deleteTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
