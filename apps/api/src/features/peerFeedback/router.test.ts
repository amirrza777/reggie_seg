import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Response } from "express";
import router from "./router.js";
import { isFeatureEnabledForUser } from "../featureFlags/service.js";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req: any, _res: any, next: NextFunction) => next()),
  createPeerFeedbackHandler: vi.fn(),
  getPeerFeedbackStatusesHandler: vi.fn(),
  getPeerFeedbackHandler: vi.fn(),
  getPeerAssessmentHandler: vi.fn(),
}));

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: mocks.requireAuth,
}));
vi.mock("../featureFlags/service.js", () => ({
  isFeatureEnabledForUser: vi.fn(),
}));
vi.mock("./controller.js", () => ({
  createPeerFeedbackHandler: mocks.createPeerFeedbackHandler,
  getPeerFeedbackStatusesHandler: mocks.getPeerFeedbackStatusesHandler,
  getPeerFeedbackHandler: mocks.getPeerFeedbackHandler,
  getPeerAssessmentHandler: mocks.getPeerAssessmentHandler,
}));

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

function getUseHandlers() {
  return (router as any).stack.filter((layer: any) => !layer.route).map((layer: any) => layer.handle);
}

describe("peerFeedback router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces auth and feature-flag middleware", async () => {
    const [requireAuthMiddleware, featureGuard] = getUseHandlers();
    expect(typeof requireAuthMiddleware).toBe("function");
    expect(typeof featureGuard).toBe("function");

    const next = vi.fn() as NextFunction;

    const unauthenticatedRes = mockRes();
    await featureGuard({ user: undefined } as any, unauthenticatedRes, next);
    expect(unauthenticatedRes.status).toHaveBeenCalledWith(401);
    expect(isFeatureEnabledForUser).not.toHaveBeenCalled();

    (isFeatureEnabledForUser as any).mockResolvedValueOnce(false);
    const disabledRes = mockRes();
    await featureGuard({ user: { sub: 42 } } as any, disabledRes, next);
    expect(isFeatureEnabledForUser).toHaveBeenCalledWith("peer_feedback", 42);
    expect(disabledRes.status).toHaveBeenCalledWith(403);

    (isFeatureEnabledForUser as any).mockResolvedValueOnce(true);
    const enabledRes = mockRes();
    await featureGuard({ user: { sub: 42 } } as any, enabledRes, next);
    expect(next).toHaveBeenCalled();
  });
});
