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
  createAssessmentHandler,
  getAssessmentHandler,
  getTeammatesHandler,
  updateAssessmentHandler,
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

describe("peerAssessment controller core handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const questionnaireTemplate = {
    id: 10,
    questions: [
      { id: 1, type: "text", configs: null },
      { id: 2, type: "multiple-choice", configs: { options: ["Excellent", "Needs work"] } },
      { id: 3, type: "rating", configs: { min: 1, max: 5 } },
      { id: 4, type: "slider", configs: { min: 0, max: 100, step: 5 } },
    ],
  };

  describe("getTeammatesHandler", () => {
    it("returns 400 for invalid params", async () => {
      const req = { query: { userId: "abc" }, params: { teamId: "1" } } as any;
      const res = createMockResponse();

      await getTeammatesHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid user ID or team ID" });
    });

    it("returns teammates on success", async () => {
      const teammates = [{ user: { id: 2, firstName: "Bob", lastName: "Jones" } }];
      const req = { query: { userId: "4" }, params: { teamId: "1" } } as any;
      const res = createMockResponse();
      serviceMocks.fetchTeammates.mockResolvedValue(teammates);

      await getTeammatesHandler(req, res);

      expect(serviceMocks.fetchTeammates).toHaveBeenCalledWith(4, 1);
      expect(res.json).toHaveBeenCalledWith(teammates);
    });

    it("returns 500 on service error", async () => {
      const req = { query: { userId: "4" }, params: { teamId: "1" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchTeammates.mockRejectedValue(new Error("boom"));

      await getTeammatesHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("createAssessmentHandler", () => {
    it("returns 400 when body is invalid", async () => {
      const req = { body: { projectId: 1, teamId: 1 } } as any;
      const res = createMockResponse();

      await createAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
    });

    it("returns assessment id on success", async () => {
      const req = {
        body: {
          projectId: 1,
          teamId: 1,
          reviewerUserId: 4,
          revieweeUserId: 2,
          templateId: 10,
          answersJson: [
            { question: "1", answer: "Strong contribution" },
            { question: "3", answer: "4" },
            { question: "4", answer: 80 },
          ],
        },
      } as any;
      const res = createMockResponse();
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue({ questionnaireTemplate });
      serviceMocks.saveAssessment.mockResolvedValue({ id: 42 });

      await createAssessmentHandler(req, res);

      expect(serviceMocks.fetchProjectQuestionnaireTemplate).toHaveBeenCalledWith(1);
      expect(serviceMocks.saveAssessment).toHaveBeenCalledWith({
        projectId: 1,
        teamId: 1,
        reviewerUserId: 4,
        revieweeUserId: 2,
        templateId: 10,
        answersJson: [
          { question: "1", answer: "Strong contribution" },
          { question: "3", answer: 4 },
          { question: "4", answer: 80 },
        ],
      });
      expect(res.json).toHaveBeenCalledWith({ ok: true, assessmentId: 42 });
    });

    it("returns 400 when answer does not match template options", async () => {
      const req = {
        body: {
          projectId: 1,
          teamId: 1,
          reviewerUserId: 4,
          revieweeUserId: 2,
          templateId: 10,
          answersJson: [{ question: "2", answer: "Maybe" }],
        },
      } as any;
      const res = createMockResponse();
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue({ questionnaireTemplate });

      await createAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Question 2 answer is not one of the configured options.",
      });
      expect(serviceMocks.saveAssessment).not.toHaveBeenCalled();
    });

    it("returns 400 when templateId does not match project's template", async () => {
      const req = {
        body: {
          projectId: 1,
          teamId: 1,
          reviewerUserId: 4,
          revieweeUserId: 2,
          templateId: 11,
          answersJson: [{ question: "1", answer: "Strong contribution" }],
        },
      } as any;
      const res = createMockResponse();
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue({ questionnaireTemplate });

      await createAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "templateId does not match the project's questionnaire template",
      });
      expect(serviceMocks.saveAssessment).not.toHaveBeenCalled();
    });

    it("returns 500 on service error", async () => {
      const req = {
        body: {
          projectId: 1,
          teamId: 1,
          reviewerUserId: 4,
          revieweeUserId: 2,
          templateId: 10,
          answersJson: [{ question: "1", answer: "x" }],
        },
      } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue({ questionnaireTemplate });
      serviceMocks.saveAssessment.mockRejectedValue(new Error("boom"));

      await createAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getAssessmentHandler", () => {
    it("returns 400 for invalid query params", async () => {
      const req = {
        query: { projectId: "x", teamId: "1", reviewerId: "4", revieweeId: "2" },
      } as any;
      const res = createMockResponse();

      await getAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid query parameters" });
    });

    it("returns 404 when assessment is missing", async () => {
      const req = {
        query: { projectId: "1", teamId: "1", reviewerId: "4", revieweeId: "2" },
      } as any;
      const res = createMockResponse();
      serviceMocks.fetchAssessment.mockResolvedValue(null);

      await getAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Assessment not found" });
    });

    it("returns assessment on success", async () => {
      const req = {
        query: { projectId: "1", teamId: "1", reviewerId: "4", revieweeId: "2" },
      } as any;
      const res = createMockResponse();
      const assessment = { id: 12 };
      serviceMocks.fetchAssessment.mockResolvedValue(assessment);

      await getAssessmentHandler(req, res);

      expect(serviceMocks.fetchAssessment).toHaveBeenCalledWith(1, 1, 4, 2);
      expect(res.json).toHaveBeenCalledWith(assessment);
    });

    it("returns 500 on service error", async () => {
      const req = {
        query: { projectId: "1", teamId: "1", reviewerId: "4", revieweeId: "2" },
      } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchAssessment.mockRejectedValue(new Error("boom"));

      await getAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("updateAssessmentHandler", () => {
    it("returns 400 for invalid assessment id", async () => {
      const req = { params: { id: "abc" }, body: { answersJson: { 1: "x" } } } as any;
      const res = createMockResponse();

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid assessment ID" });
    });

    it("returns 400 for invalid body", async () => {
      const req = { params: { id: "9" }, body: {} } as any;
      const res = createMockResponse();

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
    });

    it("returns ok on success", async () => {
      const req = { params: { id: "9" }, body: { answersJson: { 1: "Updated" } } } as any;
      const res = createMockResponse();
      serviceMocks.fetchAssessmentById.mockResolvedValue({ questionnaireTemplate });
      serviceMocks.updateAssessmentAnswers.mockResolvedValue(undefined);

      await updateAssessmentHandler(req, res);

      expect(serviceMocks.fetchAssessmentById).toHaveBeenCalledWith(9);
      expect(serviceMocks.updateAssessmentAnswers).toHaveBeenCalledWith(9, [{ question: "1", answer: "Updated" }]);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("returns 400 for answers that fail template validation", async () => {
      const req = { params: { id: "9" }, body: { answersJson: { 2: "Unknown option" } } } as any;
      const res = createMockResponse();
      serviceMocks.fetchAssessmentById.mockResolvedValue({ questionnaireTemplate });

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Question 2 answer is not one of the configured options.",
      });
      expect(serviceMocks.updateAssessmentAnswers).not.toHaveBeenCalled();
    });

    it("maps Prisma P2025 to 404", async () => {
      const req = { params: { id: "9" }, body: { answersJson: { 1: "Updated" } } } as any;
      const res = createMockResponse();
      serviceMocks.fetchAssessmentById.mockResolvedValue({ questionnaireTemplate });
      serviceMocks.updateAssessmentAnswers.mockRejectedValue({ code: "P2025" });

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Peer assessment not found" });
    });

    it("returns 500 for non-Prisma error", async () => {
      const req = { params: { id: "9" }, body: { answersJson: { 1: "Updated" } } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchAssessmentById.mockResolvedValue({ questionnaireTemplate });
      serviceMocks.updateAssessmentAnswers.mockRejectedValue(new Error("boom"));

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
