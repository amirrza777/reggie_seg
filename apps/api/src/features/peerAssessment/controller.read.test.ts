import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const serviceMocks = vi.hoisted(() => ({
  fetchTeammates: vi.fn(),
  saveAssessment: vi.fn(),
  fetchAssessment: vi.fn(),
  updateAssessmentAnswers: vi.fn(),
  fetchTeammateAssessments: vi.fn(),
  fetchQuestionsForProject: vi.fn(),
  fetchAssessmentById: vi.fn(),
  fetchProjectQuestionnaireTemplate: vi.fn(),
}));

vi.mock("./service.js", () => ({
  fetchTeammates: serviceMocks.fetchTeammates,
  saveAssessment: serviceMocks.saveAssessment,
  fetchAssessment: serviceMocks.fetchAssessment,
  updateAssessmentAnswers: serviceMocks.updateAssessmentAnswers,
  fetchTeammateAssessments: serviceMocks.fetchTeammateAssessments,
  fetchQuestionsForProject: serviceMocks.fetchQuestionsForProject,
  fetchAssessmentById: serviceMocks.fetchAssessmentById,
  fetchProjectQuestionnaireTemplate: serviceMocks.fetchProjectQuestionnaireTemplate,
}));

vi.mock("./services/PeerAssessmentService.js", () => ({
  PeerAssessmentService: vi.fn().mockImplementation(() => ({})),
}));

import {
  getAssessmentByIdHandler,
  getAssessmentsHandler,
  getProjectQuestionnaireTemplateHandler,
  getQuestionsForProjectHandler,
} from "./controller.js";

function createMockResponse() {
  const res = {} as Partial<Response> & {
    statusCode?: number;
    body?: unknown;
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response["status"];

  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as Response["json"];

  return res as Response & { statusCode?: number; body?: unknown };
}

describe("peerAssessment controller read handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAssessmentsHandler", () => {
    it("returns 400 for invalid params", async () => {
      const req = { params: { userId: "x", projectId: "1" } } as any;
      const res = createMockResponse();

      await getAssessmentsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid user ID or project ID" });
    });

    it("returns assessments list", async () => {
      const req = { params: { userId: "4", projectId: "1" } } as any;
      const res = createMockResponse();
      const assessments = [{ id: 11 }, { id: 12 }];
      serviceMocks.fetchTeammateAssessments.mockResolvedValue(assessments);

      await getAssessmentsHandler(req, res);

      expect(serviceMocks.fetchTeammateAssessments).toHaveBeenCalledWith(4, 1);
      expect(res.json).toHaveBeenCalledWith(assessments);
    });

    it("returns 500 on service error", async () => {
      const req = { params: { userId: "4", projectId: "1" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchTeammateAssessments.mockRejectedValue(new Error("boom"));

      await getAssessmentsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getAssessmentByIdHandler", () => {
    it("returns 400 for invalid id", async () => {
      const req = { params: { id: "abc" } } as any;
      const res = createMockResponse();

      await getAssessmentByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid assessment ID" });
    });

    it("returns 404 when missing", async () => {
      const req = { params: { id: "5" } } as any;
      const res = createMockResponse();
      serviceMocks.fetchAssessmentById.mockResolvedValue(null);

      await getAssessmentByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Assessment not found" });
    });

    it("returns assessment on success", async () => {
      const req = { params: { id: "5" } } as any;
      const res = createMockResponse();
      const assessment = { id: 5 };
      serviceMocks.fetchAssessmentById.mockResolvedValue(assessment);

      await getAssessmentByIdHandler(req, res);

      expect(serviceMocks.fetchAssessmentById).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith(assessment);
    });

    it("returns 500 on service error", async () => {
      const req = { params: { id: "5" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchAssessmentById.mockRejectedValue(new Error("boom"));

      await getAssessmentByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
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
