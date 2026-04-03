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

  it("falls back for fetch failures without explicit network codes", async () => {
    const networkError = new TypeError("fetch failed");
    apiFetchMock.mockRejectedValue(networkError);

    await expect(getFeatureFlagMap()).resolves.toEqual({});
    expect(logDevErrorMock).toHaveBeenCalled();
  });

  it("rethrows fetch failures with unsupported network codes", async () => {
    const networkError = new TypeError("fetch failed");
    Object.assign(networkError, { cause: { code: "SOME_OTHER_CODE" } });
    apiFetchMock.mockRejectedValue(networkError);

    await expect(getFeatureFlagMap()).rejects.toBe(networkError);
  });

  it("rethrows non-Error and non-matching TypeError failures", async () => {
    apiFetchMock.mockRejectedValueOnce("plain-failure");
    await expect(getFeatureFlagMap()).rejects.toBe("plain-failure");

    const nonMatchingTypeError = new TypeError("other failure");
    apiFetchMock.mockRejectedValueOnce(nonMatchingTypeError);
    await expect(getFeatureFlagMap()).rejects.toBe(nonMatchingTypeError);
  });

  it("accepts network error codes from the top-level error object", async () => {
    const networkError = new TypeError("fetch failed");
    Object.assign(networkError, { code: "ECONNRESET" });
    apiFetchMock.mockRejectedValue(networkError);

    await expect(getFeatureFlagMap()).resolves.toEqual({});
  });

  it("rethrows fetch failures in production even when they are network errors", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const networkError = new TypeError("fetch failed");
      Object.assign(networkError, { cause: { code: "ECONNRESET" } });
      apiFetchMock.mockRejectedValue(networkError);

      await expect(getFeatureFlagMap()).rejects.toBe(networkError);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
