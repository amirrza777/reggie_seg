import { describe, expect, it } from "vitest";
import {
  cloneDefaultWarningConfig,
  cloneWarningConfig,
  mapApiConfigToState,
} from "./mapper";
import { DEFAULT_WARNING_CONFIG } from "../types";

describe("warnings mapper", () => {
  it("clones default warning config deeply", () => {
    const cloneA = cloneDefaultWarningConfig();
    const cloneB = cloneDefaultWarningConfig();

    cloneA.attendance.minPercent = 99;

    expect(cloneB.attendance.minPercent).toBe(30);
  });

  it("clones a provided warning config deeply", () => {
    const original = cloneDefaultWarningConfig();
    const cloned = cloneWarningConfig(original);

    cloned.meetingFrequency.minPerWeek = 10;

    expect(original.meetingFrequency.minPerWeek).toBe(1);
  });

  it("maps known rules, clamps values, normalizes lookback, and returns extra rules", () => {
    const mapped = mapApiConfigToState({
      version: 1,
      rules: [
        {
          key: "LOW_ATTENDANCE",
          enabled: false,
          severity: "UNKNOWN" as any,
          params: { minPercent: 0, lookbackDays: 5 },
        },
        {
          key: "MEETING_FREQUENCY",
          enabled: true,
          severity: "LOW",
          params: { minPerWeek: -4, lookbackDays: 11 },
        },
        {
          key: "LOW_COMMIT_ACTIVITY",
          enabled: true,
          severity: "HIGH",
          params: { minCommits: "5", lookbackDays: 100 },
        },
        {
          key: "SOME_FUTURE_RULE",
          enabled: true,
          severity: "MEDIUM",
          params: { raw: true },
        },
      ],
    } as any);

    expect(mapped.state.attendance.enabled).toBe(false);
    expect(mapped.state.attendance.severity).toBe("HIGH");
    expect(mapped.state.attendance.minPercent).toBe(1);
    expect(mapped.state.attendance.lookbackDays).toBe(7);

    expect(mapped.state.meetingFrequency.severity).toBe("LOW");
    expect(mapped.state.meetingFrequency.minPerWeek).toBe(0);
    expect(mapped.state.meetingFrequency.lookbackDays).toBe(14);

    expect(mapped.state.contributionActivity.severity).toBe("HIGH");
    expect(mapped.state.contributionActivity.minCommits).toBe(5);
    expect(mapped.state.contributionActivity.lookbackDays).toBe(-1);

    expect(mapped.extraRules).toEqual([
      {
        key: "SOME_FUTURE_RULE",
        enabled: true,
        severity: "MEDIUM",
        params: { raw: true },
      },
    ]);
  });

  it("handles missing / invalid params by keeping defaults", () => {
    const mapped = mapApiConfigToState({
      version: 1,
      rules: [
        {
          key: "LOW_ATTENDANCE",
          enabled: true,
          severity: "LOW",
          params: null,
        },
        {
          key: "LOW_CONTRIBUTION_ACTIVITY",
          enabled: true,
          severity: "MEDIUM",
          params: { minCommits: Number.NaN, lookbackDays: 30 },
        },
      ],
    } as any);

    expect(mapped.state.attendance.minPercent).toBe(30);
    expect(mapped.state.attendance.lookbackDays).toBe(30);

    expect(mapped.state.contributionActivity.minCommits).toBe(4);
    expect(mapped.state.contributionActivity.lookbackDays).toBe(30);
  });

  it("handles project-start lookback and non-finite defaults safely", () => {
    const originalAttendance = DEFAULT_WARNING_CONFIG.attendance.minPercent;
    const originalMeeting = DEFAULT_WARNING_CONFIG.meetingFrequency.minPerWeek;
    const originalCommits = DEFAULT_WARNING_CONFIG.contributionActivity.minCommits;
    try {
      DEFAULT_WARNING_CONFIG.attendance.minPercent = Number.NaN;
      DEFAULT_WARNING_CONFIG.meetingFrequency.minPerWeek = Number.NaN;
      DEFAULT_WARNING_CONFIG.contributionActivity.minCommits = Number.NaN;

      const mapped = mapApiConfigToState({
        version: 1,
        rules: [
          {
            key: "LOW_ATTENDANCE",
            enabled: true,
            severity: "HIGH",
            params: { minPercent: Number.NaN, lookbackDays: -1 },
          },
          {
            key: "MEETING_FREQUENCY",
            enabled: true,
            severity: "MEDIUM",
            params: { minPerWeek: Number.NaN, lookbackDays: -1 },
          },
          {
            key: "LOW_CONTRIBUTION_ACTIVITY",
            enabled: true,
            severity: "LOW",
            params: { minCommits: Number.NaN, lookbackDays: -1 },
          },
        ],
      } as any);

      expect(mapped.state.attendance.lookbackDays).toBe(-1);
      expect(mapped.state.meetingFrequency.lookbackDays).toBe(-1);
      expect(mapped.state.contributionActivity.lookbackDays).toBe(-1);
    } finally {
      DEFAULT_WARNING_CONFIG.attendance.minPercent = originalAttendance;
      DEFAULT_WARNING_CONFIG.meetingFrequency.minPerWeek = originalMeeting;
      DEFAULT_WARNING_CONFIG.contributionActivity.minCommits = originalCommits;
    }
  });
});
