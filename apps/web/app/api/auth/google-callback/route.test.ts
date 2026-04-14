import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
    return;
  }
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe("GET /api/auth/google-callback", () => {
  it("redirects to the provided path and sets a lax cookie for http in development", async () => {
    process.env.NODE_ENV = "development";
    const req = new NextRequest(
      "http://localhost/api/auth/google-callback?token=dev-token&redirect=/dashboard",
    );

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(setCookie).toContain("tf_access_token=dev-token");
    expect(setCookie).toContain("Max-Age=900");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).not.toContain("Secure");
  });

  it("sets a secure none cookie for https callbacks", async () => {
    process.env.NODE_ENV = "development";
    const req = new NextRequest(
      "https://teamfeedback.dev/api/auth/google-callback?token=https-token&redirect=/projects",
    );

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe("https://teamfeedback.dev/projects");
    expect(setCookie).toContain("tf_access_token=https-token");
    expect(setCookie).toContain("SameSite=none");
    expect(setCookie).toContain("Secure");
  });

  it("sets a secure none cookie in production even on http", async () => {
    process.env.NODE_ENV = "production";
    const req = new NextRequest("http://localhost/api/auth/google-callback?token=prod-token&redirect=/staff");

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe("http://localhost/staff");
    expect(setCookie).toContain("tf_access_token=prod-token");
    expect(setCookie).toContain("SameSite=none");
    expect(setCookie).toContain("Secure");
  });

  it("uses the default redirect and does not set a cookie when token is missing", async () => {
    process.env.NODE_ENV = "development";
    const req = new NextRequest("http://localhost/api/auth/google-callback");

    const response = await GET(req);

    expect(response.headers.get("location")).toBe("http://localhost/app-home");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
