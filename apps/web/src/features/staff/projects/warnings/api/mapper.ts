import type {   ProjectWarningRuleConfig,
                ProjectWarningsConfig, 
                WarningRuleSeverity 
} from "@/features/projects/types";

import { DEFAULT_WARNING_CONFIG, LOOKBACK_WINDOW_OPTIONS, type WarningConfigState } from "../types";


function normalizeLookbackWindow(value: number): number {
  if (value === -1) return -1;
  if (value <= 7) return 7;
  if (value <= 14) return 14;
  if (value <= 30) return 30;
  return -1;
}

export function cloneDefaultWarningConfig(): WarningConfigState {
  return {
    attendance: { ...DEFAULT_WARNING_CONFIG.attendance },
    meetingFrequency: { ...DEFAULT_WARNING_CONFIG.meetingFrequency },
    contributionActivity: { ...DEFAULT_WARNING_CONFIG.contributionActivity },
  };
}

export function cloneWarningConfig(config: WarningConfigState): WarningConfigState {
  return {
    attendance: { ...config.attendance },
    meetingFrequency: { ...config.meetingFrequency },
    contributionActivity: { ...config.contributionActivity },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(100, value));
}

function clampNonNegative(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function toSeverity(value: unknown, fallback: WarningRuleSeverity): WarningRuleSeverity {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") return value;
  return fallback;
}

export function mapApiConfigToState(apiConfig: ProjectWarningsConfig): {
  state: WarningConfigState;
  extraRules: ProjectWarningRuleConfig[];
} {
  const state = cloneDefaultWarningConfig();
  const extraRules: ProjectWarningRuleConfig[] = [];

  for (const rule of apiConfig.rules) {
    const params = isRecord(rule.params) ? rule.params : {};

    if (rule.key === "LOW_ATTENDANCE") {
      state.attendance.enabled = rule.enabled;
      state.attendance.severity = toSeverity(rule.severity, state.attendance.severity);
      state.attendance.minPercent = clampPercent(
        toNumber(params.minPercent, state.attendance.minPercent),
        state.attendance.minPercent,
      );
      state.attendance.lookbackDays = normalizeLookbackWindow(
        toNumber(params.lookbackDays, state.attendance.lookbackDays),
      );
      continue;
    }

    if (rule.key === "MEETING_FREQUENCY") {
      state.meetingFrequency.enabled = rule.enabled;
      state.meetingFrequency.severity = toSeverity(rule.severity, state.meetingFrequency.severity);
      state.meetingFrequency.minPerWeek = clampNonNegative(
        toNumber(params.minPerWeek, state.meetingFrequency.minPerWeek),
        state.meetingFrequency.minPerWeek,
      );
      state.meetingFrequency.lookbackDays = normalizeLookbackWindow(
        toNumber(params.lookbackDays, state.meetingFrequency.lookbackDays),
      );
      continue;
    }

    if (rule.key === "LOW_CONTRIBUTION_ACTIVITY" || rule.key === "COMMIT_ACTIVITY") {
      state.contributionActivity.enabled = rule.enabled;
      state.contributionActivity.severity = toSeverity(rule.severity, state.contributionActivity.severity);
      state.contributionActivity.minCommits = clampNonNegative(
        toNumber(params.minCommits, state.contributionActivity.minCommits),
        state.contributionActivity.minCommits,
      );
      state.contributionActivity.lookbackDays = normalizeLookbackWindow(
        toNumber(params.lookbackDays, state.contributionActivity.lookbackDays),
      );
      continue;
    }

    extraRules.push(rule);
  }

  return { state, extraRules };
}