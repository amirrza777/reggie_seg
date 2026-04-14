import { describe, expect, it } from "vitest";
import { isAllowedCorsOrigin, resolveAllowedOrigins } from "./cors.js";

describe("app CORS env origins", () => {
  it("allows origins from APP_BASE_URL and ALLOWED_ORIGINS", () => {
    const allowedOrigins = resolveAllowedOrigins({
      APP_BASE_URL: "https://app.example.com/",
      ALLOWED_ORIGINS: "https://alt.example.com, https://other.example.com",
    });

    expect(allowedOrigins).toContain("https://app.example.com");
    expect(allowedOrigins).toContain("https://alt.example.com");
    expect(allowedOrigins).toContain("https://other.example.com");

    expect(isAllowedCorsOrigin("https://app.example.com", allowedOrigins)).toBe(true);
    expect(isAllowedCorsOrigin("https://alt.example.com", allowedOrigins)).toBe(true);
    expect(isAllowedCorsOrigin("https://evil.example.com", allowedOrigins)).toBe(false);
  });
});
