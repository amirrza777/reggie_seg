import { describe, expect, it, vi, beforeEach } from "vitest";
import { unstable_noStore as noStore } from "next/cache";
import { ApiError } from "./api/errors";
import { apiFetch } from "./api/http";
import { getFeatureFlagMap } from "./featureFlags";
import { logDevError } from "./lib/devLogger";

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock("./api/env", () => ({
  API_BASE_URL: "https://api.example.test",
}));

vi.mock("./api/http", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("./lib/devLogger", () => ({
  logDevError: vi.fn(),
}));

const noStoreMock = vi.mocked(noStore);
const apiFetchMock = vi.mocked(apiFetch);
const logDevErrorMock = vi.mocked(logDevError);

describe("featureFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a key-value map from fetched flags", async () => {
    apiFetchMock.mockResolvedValue([
      { key: "alpha", enabled: true },
      { key: "beta", enabled: false },
    ] as never);

    await expect(getFeatureFlagMap()).resolves.toEqual({ alpha: true, beta: false });
    expect(noStoreMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock).toHaveBeenCalledWith("/feature-flags", {
      baseUrl: "https://api.example.test",
    });
  });

  it("returns an empty map for 401/403 responses", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiError("unauthorized", { status: 401 }));
    await expect(getFeatureFlagMap()).resolves.toEqual({});

    apiFetchMock.mockRejectedValueOnce(new ApiError("forbidden", { status: 403 }));
    await expect(getFeatureFlagMap()).resolves.toEqual({});
  });

  it("rethrows non-auth errors", async () => {
    apiFetchMock.mockRejectedValue(new ApiError("boom", { status: 500 }));

    await expect(getFeatureFlagMap()).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to empty flags for fetch network failures in non-production", async () => {
    const networkError = new TypeError("fetch failed");
    Object.assign(networkError, { cause: { code: "ECONNREFUSED" } });
    apiFetchMock.mockRejectedValue(networkError);

    await expect(getFeatureFlagMap()).resolves.toEqual({});
    expect(logDevErrorMock).toHaveBeenCalled();
  });
});
