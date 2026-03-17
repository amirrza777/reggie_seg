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

import { getAssessmentHandler, getTeammatesHandler } from "./controller.js";

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

describe("peerAssessment controller fetch handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});
