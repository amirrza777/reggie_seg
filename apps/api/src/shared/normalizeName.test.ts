import { describe, it, expect } from "vitest";
import { normalizeName } from "./normalizeName.js";

describe("normalizeName", () => {
  it("lowercases the name", () => {
    expect(normalizeName("Reggie King")).toBe("reggie king");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeName("Reggie   King")).toBe("reggie king");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  Reggie King  ")).toBe("reggie king");
  });

  it("handles a single word", () => {
    expect(normalizeName("Reggie")).toBe("reggie");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeName("   ")).toBe("");
  });
});
