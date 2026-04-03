import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("returns empty output for nullish, empty, and invalid inputs", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate(new Date("invalid"))).toBe("");
  });

  it("formats valid date values with locale support", () => {
    expect(formatDate("2026-03-01T00:00:00.000Z", "en-US")).toBe("Mar 1, 2026");
    expect(formatDate(new Date("2026-03-01T00:00:00.000Z"), "en-GB")).toBe("1 Mar 2026");
  });
});
