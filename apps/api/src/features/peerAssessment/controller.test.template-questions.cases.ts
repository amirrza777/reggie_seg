import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockResponse,
  getProjectQuestionnaireTemplateHandler,
  getQuestionsForProjectHandler,
  serviceMocks,
} from "./controller.shared-test-helpers.js";

describe("peerAssessment controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQuestionsForProjectHandler", () => {
    it("returns 400 for invalid project id", async () => {
      const req = { params: { projectId: "abc" } } as any;
      const res = createMockResponse();

      await getQuestionsForProjectHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid project ID" });
    });

    it("returns 404 when questionnaire template is missing", async () => {
      const req = { params: { projectId: "7" } } as any;
      const res = createMockResponse();
      serviceMocks.fetchQuestionsForProject.mockResolvedValue(null);

      await getQuestionsForProjectHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Questionnaire template not found for this project",
      });
    });

    it("returns template questions on success", async () => {
      const req = { params: { projectId: "7" } } as any;
      const res = createMockResponse();
      const template = {
        questionnaireTemplate: {
          id: 3,
          questions: [{ id: 1, label: "Q1" }],
        },
      };
      serviceMocks.fetchQuestionsForProject.mockResolvedValue(template);

      await getQuestionsForProjectHandler(req, res);

      expect(serviceMocks.fetchQuestionsForProject).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith(template.questionnaireTemplate);
    });

    it("returns 500 on service error", async () => {
      const req = { params: { projectId: "7" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchQuestionsForProject.mockRejectedValue(new Error("boom"));

      await getQuestionsForProjectHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getProjectQuestionnaireTemplateHandler", () => {
    it("returns 400 for invalid project id", async () => {
      const req = { params: { projectId: "abc" } } as any;
      const res = createMockResponse();

      await getProjectQuestionnaireTemplateHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid project ID" });
    });

    it("returns 404 when questionnaire template is missing", async () => {
      const req = { params: { projectId: "7" } } as any;
      const res = createMockResponse();
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue(null);

      await getProjectQuestionnaireTemplateHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Questionnaire template not found for this project",
      });
    });

    it("returns questionnaire template on success", async () => {
      const req = { params: { projectId: "7" } } as any;
      const res = createMockResponse();
      const template = {
        questionnaireTemplate: {
          id: 3,
          questions: [{ id: 1, label: "Q1" }],
        },
      };
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue(template);

      await getProjectQuestionnaireTemplateHandler(req, res);

      expect(serviceMocks.fetchProjectQuestionnaireTemplate).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith(template.questionnaireTemplate);
    });

    it("returns 500 on service error", async () => {
      const req = { params: { projectId: "7" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchProjectQuestionnaireTemplate.mockRejectedValue(new Error("boom"));

      await getProjectQuestionnaireTemplateHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
