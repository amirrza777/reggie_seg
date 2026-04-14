import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "./errors";

const getAccessTokenMock = vi.fn();
const setAccessTokenMock = vi.fn();
const clearAccessTokenMock = vi.fn();

vi.mock("@/features/auth/api/session", () => ({
  getAccessToken: (...args: unknown[]) => getAccessTokenMock(...args),
  setAccessToken: (...args: unknown[]) => setAccessTokenMock(...args),
  clearAccessToken: (...args: unknown[]) => clearAccessTokenMock(...args),
}));

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(payload: string, status = 200) {
  return new Response(payload, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

async function loadApiFetch() {
  const { apiFetch } = await import("./http");
  return apiFetch;
}

async function loadHttpInternals() {
  const { __httpInternals } = await import("./http");
  return __httpInternals;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.unmock("next/headers");
    getAccessTokenMock.mockReset();
    setAccessTokenMock.mockReset();
    clearAccessTokenMock.mockReset();
  });

  it("retries protected requests with a refreshed token", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Missing access token" }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await expect(apiFetch<{ ok: boolean }>("/projects/staff/mine?userId=7")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/auth/refresh",
      expect.objectContaining({ method: "POST" }),
    );
    const retryOptions = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(new Headers(retryOptions.headers).get("Authorization")).toBe("Bearer fresh-token");
    expect(setAccessTokenMock).toHaveBeenCalledWith("fresh-token");
  });

  it("forwards request cookie header to refresh when available", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Missing access token" }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await apiFetch<{ ok: boolean }>("/projects/staff/mine?userId=7", {
      headers: [["Cookie", "refresh_token=rt-1"]],
    });

    const refreshOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(refreshOptions.headers).get("Cookie")).toBe("refresh_token=rt-1");
  });

  it("returns text body when parse='text' and auth is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(textResponse("plain text"));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await expect(apiFetch<string>("/status", { parse: "text", auth: false, baseUrl: "https://api.example.com" })).resolves.toBe("plain text");

    expect(getAccessTokenMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/status",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws ApiError with friendly message from JSON error payload", async () => {
    getAccessTokenMock.mockReturnValue("token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ message: "Not allowed" }, 403)) as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();

    await expect(apiFetch("/admin")).rejects.toMatchObject<ApiError>({
      name: "ApiError",
      message: "Not allowed",
      status: 403,
    });
  });

  it("throws ApiError with plain text fallback when response is not JSON", async () => {
    getAccessTokenMock.mockReturnValue("token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(textResponse("Service unavailable", 503)) as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await expect(apiFetch("/health")).rejects.toMatchObject<ApiError>({
      message: "Service unavailable",
      status: 503,
      details: "Service unavailable",
    });
  });

  it("does not attempt token refresh on /auth/* paths", async () => {
    getAccessTokenMock.mockReturnValue("token");
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ error: "No auth" }, 401));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await expect(apiFetch("/auth/login")).rejects.toMatchObject({ name: "ApiError", status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clearAccessTokenMock).not.toHaveBeenCalled();
    expect(setAccessTokenMock).not.toHaveBeenCalled();
  });

  it("clears access token when refresh request fails or returns no token", async () => {
    getAccessTokenMock.mockReturnValue(null);

    const fetchFailRefresh = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "missing token" }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "refresh denied" }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "missing token" }, 401));
    vi.stubGlobal("fetch", fetchFailRefresh as unknown as typeof fetch);
    const apiFetchA = await loadApiFetch();
    await expect(apiFetchA("/projects")).rejects.toMatchObject({ name: "ApiError" });
    expect(clearAccessTokenMock).toHaveBeenCalledTimes(1);

    vi.resetModules();
    getAccessTokenMock.mockReturnValue(null);
    const fetchMissingToken = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "missing token" }, 401))
      .mockResolvedValueOnce(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMissingToken as unknown as typeof fetch);
    const apiFetchB = await loadApiFetch();
    await expect(apiFetchB("/projects")).rejects.toMatchObject({ name: "ApiError" });

    expect(clearAccessTokenMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent refresh calls with a shared in-flight promise", async () => {
    getAccessTokenMock.mockReturnValue(null);

    let resolveRefresh: (value: Response) => void = () => undefined;
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return refreshPromise;
      }
      const authHeader = new Headers(init?.headers).get("Authorization");
      if (authHeader === "Bearer fresh-token") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({ error: "Missing access token" }, 401));
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    const requestA = apiFetch<{ ok: boolean }>("/projects/a");
    const requestB = apiFetch<{ ok: boolean }>("/projects/b");

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
    });

    resolveRefresh(jsonResponse({ accessToken: "fresh-token" }));
    await expect(Promise.all([requestA, requestB])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(setAccessTokenMock).toHaveBeenCalledTimes(1);
  });

  it("uses server-side cookies for auth headers when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        getAll: () => [
          { name: "tf_access_token", value: "server-token" },
          { name: "refresh_token", value: "rt-123" },
        ],
        get: (name: string) => (name === "tf_access_token" ? { value: " server-token " } : undefined),
      }),
    }));

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await apiFetch("/projects");

    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer server-token");
    expect(headers.get("Cookie")).toContain("refresh_token=rt-123");
  });

  it("respects existing server auth/cookie headers and handles refresh fetch errors", async () => {
    vi.stubGlobal("window", undefined);
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        getAll: () => [{ name: "tf_access_token", value: "server-token" }],
        get: () => ({ value: "server-token" }),
      }),
    }));

    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "missing token" }, 401))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const apiFetch = await loadApiFetch();
    await expect(apiFetch("/projects", { headers: { Authorization: "Bearer provided", Cookie: "rt=provided" } })).rejects.toMatchObject({
      name: "ApiError",
    });

    const initialHeaders = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);
    const refreshHeaders = new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit).headers);
    expect(initialHeaders.get("Authorization")).toBe("Bearer provided");
    expect(initialHeaders.get("Cookie")).toBe("rt=provided");
    expect(refreshHeaders.get("Cookie")).toBe("rt=provided");
    expect(clearAccessTokenMock).toHaveBeenCalled();
  });

  it("covers internal header helpers for arrays/objects and merge behavior", async () => {
    const { hasHeader, readHeader, mergeHeaders } = await loadHttpInternals();

    expect(hasHeader([["Authorization", "Bearer t"]], "authorization")).toBe(true);
    expect(hasHeader({ Cookie: "a=1" }, "cookie")).toBe(true);
    expect(hasHeader(undefined, "cookie")).toBe(false);

    expect(readHeader([["Cookie", "a=1"]], "cookie")).toBe("a=1");
    expect(
      readHeader({ Cookie: ["a=1", "b=2"] as unknown as string } as unknown as HeadersInit, "cookie"),
    ).toBe("a=1, b=2");
    expect(readHeader({ Authorization: "Bearer x" }, "cookie")).toBeNull();

    const merged = mergeHeaders(
      { Authorization: "Bearer old" },
      [["Authorization", "Bearer new"]],
      new Headers({ Cookie: "c=3" }),
    );
    expect(merged.get("Authorization")).toBe("Bearer new");
    expect(merged.get("Cookie")).toBe("c=3");
  });

  it("returns empty server auth headers when next/headers import fails", async () => {
    vi.stubGlobal("window", undefined);
    vi.doMock("next/headers", () => {
      throw new Error("module unavailable");
    });
    const { getServerAuthHeaders } = await loadHttpInternals();

    await expect(getServerAuthHeaders(undefined)).resolves.toEqual({ authHeaders: {}, cookieHeader: null });
  });
});
