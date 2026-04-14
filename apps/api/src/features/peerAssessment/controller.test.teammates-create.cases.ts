import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAssessmentHandler,
  createMockResponse,
  getTeammatesHandler,
  serviceMocks,
} from "./controller.shared-test-helpers.js";

describe("peerAssessment controller", () => {
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
          answersJson: [{ question: "1", answer: "Strong contribution" }],
        },
      } as any;
      const res = createMockResponse();
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue({
        questionnaireTemplate: {
          id: 10,
          questions: [{ id: 1, type: "text", configs: null }],
        },
      });
      serviceMocks.saveAssessment.mockResolvedValue({ id: 42 });

      await createAssessmentHandler(req, res);

      expect(serviceMocks.saveAssessment).toHaveBeenCalledWith({
        ...req.body,
        answersJson: [{ question: "1", answer: "Strong contribution" }],
      });
      expect(res.json).toHaveBeenCalledWith({ ok: true, assessmentId: 42 });
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
      serviceMocks.fetchProjectQuestionnaireTemplate.mockResolvedValue({
        questionnaireTemplate: {
          id: 10,
          questions: [{ id: 1, type: "text", configs: null }],
        },
      });
      serviceMocks.saveAssessment.mockRejectedValue(new Error("boom"));

      await createAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
