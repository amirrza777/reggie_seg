// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session";

describe("auth session token storage (SSR)", () => {
  it("returns null and no-ops when window/document are unavailable", () => {
    expect(getAccessToken()).toBeNull();
    expect(() => setAccessToken("server-token")).not.toThrow();
    expect(() => clearAccessToken()).not.toThrow();
  });
});
