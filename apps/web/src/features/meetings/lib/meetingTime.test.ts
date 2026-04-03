import { daysToMs, isWithinEditWindow } from "./meetingTime";
import { vi } from "vitest";

describe("daysToMs", () => {
  it("converts 1 day to milliseconds", () => {
    expect(daysToMs(1)).toBe(86_400_000);
  });

  it("converts 7 days to milliseconds", () => {
    expect(daysToMs(7)).toBe(604_800_000);
  });

  it("returns 0 for 0 days", () => {
    expect(daysToMs(0)).toBe(0);
  });
});

describe("isWithinEditWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when elapsed time is within the window", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
    expect(isWithinEditWindow("2026-03-08T12:00:00Z", 7)).toBe(true);
  });

  it("returns false when elapsed time exceeds the window", () => {
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
    expect(isWithinEditWindow("2026-03-01T12:00:00Z", 7)).toBe(false);
  });

  it("returns true at the exact boundary", () => {
    vi.setSystemTime(new Date("2026-03-08T12:00:00Z"));
    expect(isWithinEditWindow("2026-03-01T12:00:00Z", 7)).toBe(true);
  });

  it("returns true for a future meeting date", () => {
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
    expect(isWithinEditWindow("2026-03-10T12:00:00Z", 7)).toBe(true);
  });
});
