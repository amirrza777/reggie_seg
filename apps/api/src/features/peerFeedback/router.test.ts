import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction } from "express";
import router from "./router.js";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req: any, _res: any, next: NextFunction) => next()),
  createPeerFeedbackHandler: vi.fn(),
  getPeerFeedbackReviewsByAssessmentsHandler: vi.fn(),
  getPeerFeedbackStatusesHandler: vi.fn(),
  getPeerFeedbackHandler: vi.fn(),
  getPeerAssessmentHandler: vi.fn(),
}));

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: mocks.requireAuth,
}));
vi.mock("./controller.js", () => ({
  createPeerFeedbackHandler: mocks.createPeerFeedbackHandler,
  getPeerFeedbackReviewsByAssessmentsHandler: mocks.getPeerFeedbackReviewsByAssessmentsHandler,
  getPeerFeedbackStatusesHandler: mocks.getPeerFeedbackStatusesHandler,
  getPeerFeedbackHandler: mocks.getPeerFeedbackHandler,
  getPeerAssessmentHandler: mocks.getPeerAssessmentHandler,
}));

function getUseHandlers() {
  return (router as any).stack.filter((layer: any) => !layer.route).map((layer: any) => layer.handle);
}

describe("peerFeedback router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies requireAuth middleware before routes", async () => {
    const [requireAuthMiddleware] = getUseHandlers();
    expect(typeof requireAuthMiddleware).toBe("function");

    const next = vi.fn() as NextFunction;
    await requireAuthMiddleware({ user: { sub: 42 } } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });
});
