import { describe, expect, it } from "vitest";
import { DEFAULT_WARNING_CONFIG, LOOKBACK_WINDOW_OPTIONS } from "./types";

describe("staff warnings types", () => {
  it("exposes expected default warning config", () => {
    expect(DEFAULT_WARNING_CONFIG).toEqual({
      attendance: { enabled: true, severity: "HIGH", minPercent: 30, lookbackDays: 30 },
      meetingFrequency: { enabled: true, severity: "MEDIUM", minPerWeek: 1, lookbackDays: 30 },
      contributionActivity: { enabled: false, severity: "MEDIUM", minCommits: 4, lookbackDays: 14 },
    });
  });

  it("exposes supported lookback options", () => {
    expect(LOOKBACK_WINDOW_OPTIONS).toEqual([
      { value: 7, label: "Last 7 days" },
      { value: 14, label: "Last 14 days" },
      { value: 30, label: "Last 30 days" },
      { value: -1, label: "Since project start" },
    ]);
  });
});
