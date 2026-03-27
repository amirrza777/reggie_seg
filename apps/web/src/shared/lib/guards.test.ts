import { describe, expect, it } from "vitest";
import { isDefined, isNonEmptyString } from "./guards";

describe("guards", () => {
  it("checks non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
  });

  it("checks defined values", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
});
