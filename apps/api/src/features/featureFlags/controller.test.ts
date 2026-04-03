import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  listFeatureFlagsForUser: vi.fn(),
}));

vi.mock("./service.js", () => ({
  listFeatureFlagsForUser: serviceMocks.listFeatureFlagsForUser,
}));

import { listFeatureFlagsHandler } from "./controller.js";

describe("featureFlags controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated user is present", async () => {
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);

    await listFeatureFlagsHandler({} as any, res);

    expect(serviceMocks.listFeatureFlagsForUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });

  it("returns 403 when user cannot access feature flags", async () => {
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    serviceMocks.listFeatureFlagsForUser.mockResolvedValueOnce(null);

    await listFeatureFlagsHandler({ user: { sub: 22 } } as any, res);

    expect(serviceMocks.listFeatureFlagsForUser).toHaveBeenCalledWith(22);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns feature flags json payload on success", async () => {
    const res: any = { status: vi.fn(), json: vi.fn() };
    const flags = [{ key: "repos", enabled: true }];
    serviceMocks.listFeatureFlagsForUser.mockResolvedValueOnce(flags);

    await listFeatureFlagsHandler({ user: { sub: 33 } } as any, res);

    expect(serviceMocks.listFeatureFlagsForUser).toHaveBeenCalledWith(33);
    expect(res.json).toHaveBeenCalledWith(flags);
    expect(res.status).not.toHaveBeenCalled();
  });
});
