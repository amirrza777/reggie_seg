import { afterEach, describe, expect, it, vi } from "vitest";

describe("api env helpers", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    vi.resetModules();
  });

  it("uses loopback browser host when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const { getApiBaseUrl } = await import("./env");
    expect(getApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("prefers env base url when set to a non-loopback host", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
    const { getApiBaseUrl } = await import("./env");
    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });

  it("resolves request base to request loopback host when env loopback differs", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000";
    const { getApiBaseForRequest } = await import("./env");
    expect(getApiBaseForRequest("localhost:3001", "https")).toBe("https://localhost:3000");
  });

  it("falls back to env or localhost for request base", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
    const { getApiBaseForRequest, API_BASE_URL } = await import("./env");

    expect(getApiBaseForRequest("mycorp.example.com:443", "https")).toBe("https://api.example.com");
    expect(API_BASE_URL).toBe("https://api.example.com");
  });
});
