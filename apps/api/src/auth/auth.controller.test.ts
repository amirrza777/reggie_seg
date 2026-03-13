import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("auth.controller.ts (nestjs legacy)", () => {
  it("defines signup/login/refresh/logout handlers and refresh cookie settings", () => {
    const source = readFileSync(new URL("./auth.controller.ts", import.meta.url), "utf8");
    expect(source).toContain("@Post('signup')");
    expect(source).toContain("@Post('login')");
    expect(source).toContain("@Post('refresh')");
    expect(source).toContain("@Post('logout')");
    expect(source).toContain("res.cookie('refresh_token'");
    expect(source).toContain("path: '/auth/refresh'");
  });
});
