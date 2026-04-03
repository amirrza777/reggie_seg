import { describe, expect, it } from "vitest";
import {
  addDaysUTC,
  getEndOfWeekDateKey,
  getStartOfWeekDateKey,
  getWeekKeysBetweenDateKeys,
  getWeekStartKeyLocal,
  getWeekStartKeyUTC,
} from "./weekUtils";

describe("weekUtils", () => {
  it("computes week starts for local and UTC dates", () => {
    const thursday = new Date("2026-04-02T12:00:00Z");
    expect(getWeekStartKeyLocal(thursday)).toBe("2026-03-30");
    expect(getWeekStartKeyUTC(thursday)).toBe("2026-03-30");
  });

  it("adds UTC days and returns week boundary keys", () => {
    expect(addDaysUTC("2026-03-30", 6)).toBe("2026-04-05");
    expect(getStartOfWeekDateKey("2026-03-30")).toBe("2026-03-30");
    expect(getEndOfWeekDateKey("2026-03-30")).toBe("2026-04-05");
  });

  it("returns Monday keys between a date range", () => {
    expect(getWeekKeysBetweenDateKeys("2026-03-31", "2026-04-14")).toEqual([
      "2026-03-30",
      "2026-04-06",
      "2026-04-13",
    ]);
  });
});

