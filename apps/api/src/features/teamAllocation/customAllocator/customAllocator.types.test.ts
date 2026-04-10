import { describe, expect, it } from "vitest";
import { EPSILON } from "./customAllocator.types.js";

describe("customAllocator.types", () => {
  it("exposes EPSILON as a small positive number", () => {
    expect(EPSILON).toBeGreaterThan(0);
    expect(EPSILON).toBeLessThan(0.001);
  });

  it("keeps EPSILON stable for floating-point guards", () => {
    expect(EPSILON).toBe(1e-9);
  });
});