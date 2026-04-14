import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockResponse,
  getAssessmentByIdHandler,
  getAssessmentHandler,
  getAssessmentsHandler,
  serviceMocks,
  updateAssessmentHandler,
} from "./controller.test.shared.js";

describe("peerAssessment controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      serviceMocks.fetchAssessmentById.mockResolvedValue({
        id: 9,
        questionnaireTemplate: { questions: [{ id: 1, type: "text", configs: null }] },
      });
      serviceMocks.updateAssessmentAnswers.mockResolvedValue(undefined);

      await updateAssessmentHandler(req, res);

      expect(serviceMocks.updateAssessmentAnswers).toHaveBeenCalledWith(9, [{ question: "1", answer: "Updated" }]);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("maps Prisma P2025 to 404", async () => {
      const req = { params: { id: "9" }, body: { answersJson: { 1: "Updated" } } } as any;
      const res = createMockResponse();
      serviceMocks.fetchAssessmentById.mockResolvedValue({
        id: 9,
        questionnaireTemplate: { questions: [{ id: 1, type: "text", configs: null }] },
      });
      serviceMocks.updateAssessmentAnswers.mockRejectedValue({ code: "P2025" });

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Peer assessment not found" });
    });

    it("returns 500 for non-Prisma error", async () => {
      const req = { params: { id: "9" }, body: { answersJson: { 1: "Updated" } } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.fetchAssessmentById.mockResolvedValue({
        id: 9,
        questionnaireTemplate: { questions: [{ id: 1, type: "text", configs: null }] },
      });
      serviceMocks.updateAssessmentAnswers.mockRejectedValue(new Error("boom"));

      await updateAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
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
});
