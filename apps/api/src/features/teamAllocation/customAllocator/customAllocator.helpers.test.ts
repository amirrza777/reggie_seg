import { describe, expect, it } from "vitest";
import {
  createSeededRng,
  mean,
  normalizeResponseValue,
  roundToTwo,
  shuffle,
  stripResponses,
  variance,
} from "./customAllocator.helpers.js";

describe("customAllocator.helpers", () => {
  it("creates deterministic seeded random sequences", () => {
    const left = createSeededRng(42);
    const right = createSeededRng(42);
    expect([left(), left(), left()]).toEqual([right(), right(), right()]);
  });

  it("shuffles without mutating the original array", () => {
    const items = [1, 2, 3, 4];
    const result = shuffle(items, createSeededRng(7));
    expect(result).toHaveLength(items.length);
    expect(result).toEqual(expect.arrayContaining(items));
    expect(items).toEqual([1, 2, 3, 4]);
  });

  it("normalizes supported response values", () => {
    expect(normalizeResponseValue("  4 ")).toBe(4);
    expect(normalizeResponseValue(" yes ")).toBe("yes");
    expect(normalizeResponseValue(true)).toBe("true");
    expect(normalizeResponseValue(false)).toBe("false");
    expect(normalizeResponseValue("  ")).toBeNull();
    expect(normalizeResponseValue(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeResponseValue({ role: "owner" })).toBe("[object Object]");
  });

  it("calculates mean and variance", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(variance([2, 4, 6])).toBeCloseTo(2.6667, 4);
    expect(variance([2])).toBe(0);
  });

  it("rounds numbers and strips responses from students", () => {
    expect(roundToTwo(1.236)).toBe(1.24);
    const student = { id: 1, firstName: "A", responses: { 10: 5 } };
    expect(stripResponses(student)).toEqual({ id: 1, firstName: "A" });
  });
});
