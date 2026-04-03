import type { WarningRuleSeverity } from "@/features/projects/types";

export type WarningConfigState = {
  attendance: {
    enabled: boolean;
    severity: WarningRuleSeverity;
    minPercent: number;
    lookbackDays: number;
  };
  meetingFrequency: {
    enabled: boolean;
    severity: WarningRuleSeverity;
    minPerWeek: number;
    lookbackDays: number;
  };
  contributionActivity: {
    enabled: boolean;
    severity: WarningRuleSeverity;
    minCommits: number;
    lookbackDays: number;
  };
};

export const DEFAULT_WARNING_CONFIG: WarningConfigState = {
  attendance: { enabled: true, severity: "HIGH", minPercent: 30, lookbackDays: 30 },
  meetingFrequency: { enabled: true, severity: "MEDIUM", minPerWeek: 1, lookbackDays: 30 },
  contributionActivity: { enabled: false, severity: "MEDIUM", minCommits: 4, lookbackDays: 14 },
};

export const LOOKBACK_WINDOW_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: -1, label: "Since project start" },
] as const;;
