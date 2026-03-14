import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccessTokenMock = vi.fn();
const setAccessTokenMock = vi.fn();
const clearAccessTokenMock = vi.fn();

vi.mock("@/features/auth/api/session", () => ({
  getAccessToken: (...args: unknown[]) => getAccessTokenMock(...args),
  setAccessToken: (...args: unknown[]) => setAccessTokenMock(...args),
  clearAccessToken: (...args: unknown[]) => clearAccessTokenMock(...args),
}));

import { apiFetch } from "./http";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch token recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    await apiFetch<{ ok: boolean }>("/projects/staff/mine?userId=7", {
      headers: { Cookie: "refresh_token=rt-1" },
    });

    const refreshOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(refreshOptions.headers).get("Cookie")).toBe("refresh_token=rt-1");
  });
});
