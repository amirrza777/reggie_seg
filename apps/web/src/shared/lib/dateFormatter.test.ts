import { describe, expect, it } from "vitest";
import { formatDateTime } from "./dateFormatter";

describe("formatDateTime", () => {
  it("returns an empty string for missing input", () => {
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime("")).toBe("");
  });

  it("formats a valid date string in en-GB style", () => {
    const formatted = formatDateTime("2026-01-02T03:04:00.000Z");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("Jan");
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});
