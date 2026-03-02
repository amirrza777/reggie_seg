import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const serviceMocks = vi.hoisted(() => ({
  saveFeedbackReview: vi.fn(),
  getFeedbackReview: vi.fn(),
  getPeerAssessment: vi.fn(),
}));

vi.mock("./service.js", () => ({
  saveFeedbackReview: serviceMocks.saveFeedbackReview,
  getFeedbackReview: serviceMocks.getFeedbackReview,
  getPeerAssessment: serviceMocks.getPeerAssessment,
}));

import {
  createPeerFeedbackHandler,
  getPeerAssessmentHandler,
  getPeerFeedbackHandler,
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

describe("peerFeedback controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPeerFeedbackHandler", () => {
    it("returns 400 for invalid feedback id", async () => {
      const req = {
        params: { feedbackId: "abc" },
        body: { agreements: {} },
      } as any;
      const res = createMockResponse();

      await createPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid feedback ID" });
    });

    it("returns 400 for invalid agreements object", async () => {
      const req = {
        params: { feedbackId: "3" },
        body: { agreements: null },
      } as any;
      const res = createMockResponse();

      await createPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid agreements object" });
    });

    it("returns 400 for invalid agreement entry shape", async () => {
      const req = {
        params: { feedbackId: "3" },
        body: {
          agreements: {
            "1": null,
          },
        },
      } as any;
      const res = createMockResponse();

      await createPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid agreement value for 1" });
    });

    it("returns 400 for invalid selected option or score", async () => {
      const req = {
        params: { feedbackId: "3" },
        body: {
          agreements: {
            "1": { selected: "Bad option", score: 10 },
          },
        },
      } as any;
      const res = createMockResponse();

      await createPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid agreement option or score for 1",
      });
    });

    it("saves feedback review on success", async () => {
      const req = {
        params: { feedbackId: "4" },
        body: {
          agreements: {
            "1": { selected: "Agree", score: 4 },
            "2": { selected: "Strongly Agree", score: 5 },
          },
          reviewerUserId: "6",
          revieweeUserId: "9",
          reviewText: "Helpful and constructive",
        },
      } as any;
      const res = createMockResponse();
      const saved = { id: 99 };
      serviceMocks.saveFeedbackReview.mockResolvedValue(saved);

      await createPeerFeedbackHandler(req, res);

      expect(serviceMocks.saveFeedbackReview).toHaveBeenCalledWith(4, {
        reviewText: "Helpful and constructive",
        agreements: req.body.agreements,
        reviewerUserId: "6",
        revieweeUserId: "9",
      });
      expect(res.json).toHaveBeenCalledWith({ ok: true, saved });
    });

    it("uses empty string when reviewText is missing", async () => {
      const req = {
        params: { feedbackId: "4" },
        body: {
          agreements: {
            "1": { selected: "Reasonable", score: 3 },
          },
          reviewerUserId: "6",
          revieweeUserId: "9",
        },
      } as any;
      const res = createMockResponse();
      serviceMocks.saveFeedbackReview.mockResolvedValue({ id: 1 });

      await createPeerFeedbackHandler(req, res);

      expect(serviceMocks.saveFeedbackReview).toHaveBeenCalledWith(4, {
        reviewText: "",
        agreements: req.body.agreements,
        reviewerUserId: "6",
        revieweeUserId: "9",
      });
    });

    it("returns 500 on save error", async () => {
      const req = {
        params: { feedbackId: "4" },
        body: {
          agreements: {
            "1": { selected: "Agree", score: 4 },
          },
          reviewerUserId: "6",
          revieweeUserId: "9",
        },
      } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.saveFeedbackReview.mockRejectedValue(new Error("boom"));

      await createPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getPeerFeedbackHandler", () => {
    it("returns 400 for invalid feedback id", async () => {
      const req = { params: { feedbackId: "abc" } } as any;
      const res = createMockResponse();

      await getPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid feedback ID" });
    });

    it("returns 404 when review does not exist", async () => {
      const req = { params: { feedbackId: "7" } } as any;
      const res = createMockResponse();
      serviceMocks.getFeedbackReview.mockResolvedValue(null);

      await getPeerFeedbackHandler(req, res);

      expect(serviceMocks.getFeedbackReview).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Review not found" });
    });

    it("returns review on success", async () => {
      const req = { params: { feedbackId: "7" } } as any;
      const res = createMockResponse();
      const review = { id: 10 };
      serviceMocks.getFeedbackReview.mockResolvedValue(review);

      await getPeerFeedbackHandler(req, res);

      expect(serviceMocks.getFeedbackReview).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith(review);
    });

    it("returns 500 on retrieval error", async () => {
      const req = { params: { feedbackId: "7" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.getFeedbackReview.mockRejectedValue(new Error("boom"));

      await getPeerFeedbackHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getPeerAssessmentHandler", () => {
    it("returns 400 for invalid feedback id", async () => {
      const req = { params: { feedbackId: "abc" } } as any;
      const res = createMockResponse();

      await getPeerAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid feedback ID" });
    });

    it("returns 404 when assessment is missing", async () => {
      const req = { params: { feedbackId: "8" } } as any;
      const res = createMockResponse();
      serviceMocks.getPeerAssessment.mockResolvedValue(null);

      await getPeerAssessmentHandler(req, res);

      expect(serviceMocks.getPeerAssessment).toHaveBeenCalledWith(8);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Assessment not found" });
    });

    it("returns assessment on success", async () => {
      const req = { params: { feedbackId: "8" } } as any;
      const res = createMockResponse();
      const assessment = { id: 8 };
      serviceMocks.getPeerAssessment.mockResolvedValue(assessment);

      await getPeerAssessmentHandler(req, res);

      expect(serviceMocks.getPeerAssessment).toHaveBeenCalledWith(8);
      expect(res.json).toHaveBeenCalledWith(assessment);
    });

    it("returns 500 on service error", async () => {
      const req = { params: { feedbackId: "8" } } as any;
      const res = createMockResponse();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      serviceMocks.getPeerAssessment.mockRejectedValue(new Error("boom"));

      await getPeerAssessmentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
