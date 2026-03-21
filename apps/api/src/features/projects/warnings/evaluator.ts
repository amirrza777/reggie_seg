export type WarningRuleSeverity = "LOW" | "MEDIUM" | "HIGH";

export type ProjectWarningRuleConfig = {
  key: string;
  enabled: boolean;
  severity?: WarningRuleSeverity;
  params?: Record<string, unknown>;
};

export type ProjectWarningsConfig = {
  version: 1;
  rules: ProjectWarningRuleConfig[];
};

export type TeamWarningSignalSnapshot = {
  id: number;
  teamName: string;
  meetings: Array<{
    date: Date;
    attendances: Array<{ status: string }>;
  }>;
};

export type EvaluatedTeamWarning = {
  teamId: number;
  type: string;
  severity: WarningRuleSeverity;
  title: string;
  details: string;
};

export type WarningEvaluationResult = {
  warnings: EvaluatedTeamWarning[];
  skippedRuleKeys: string[];
};

const PRESENT_STATUSES = new Set(["present", "on_time", "late", "attended"]);

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function getLookbackDays(rule: ProjectWarningRuleConfig, fallback: number): number {
  const raw = rule.params?.lookbackDays;
  const value = Math.floor(normalizeNumber(raw, fallback));
  return Math.min(365, Math.max(1, value));
}

function getSeverity(rule: ProjectWarningRuleConfig, fallback: WarningRuleSeverity): WarningRuleSeverity {
  if (rule.severity === "LOW" || rule.severity === "MEDIUM" || rule.severity === "HIGH") {
    return rule.severity;
  }
  return fallback;
}

function isWithinLookback(meetingDate: Date, now: Date, lookbackDays: number) {
  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  return meetingDate.getTime() >= cutoff;
}

function evaluateLowAttendanceRule(
  rule: ProjectWarningRuleConfig,
  team: TeamWarningSignalSnapshot,
  now: Date,
): EvaluatedTeamWarning | null {
  const lookbackDays = getLookbackDays(rule, 30);
  const minPercent = Math.min(100, Math.max(0, normalizeNumber(rule.params?.minPercent, 30)));
  const severity = getSeverity(rule, "HIGH");

  const meetings = team.meetings.filter((meeting) => isWithinLookback(meeting.date, now, lookbackDays));
  const statuses = meetings.flatMap((meeting) => meeting.attendances.map((attendance) => attendance.status.trim().toLowerCase()));
  const markedCount = statuses.length;
  if (markedCount === 0) return null;

  const presentCount = statuses.filter((status) => PRESENT_STATUSES.has(status)).length;
  const attendancePercent = (presentCount / markedCount) * 100;
  if (attendancePercent >= minPercent) return null;

  return {
    teamId: team.id,
    type: "LOW_ATTENDANCE",
    severity,
    title: "Low attendance detected",
    details: `Attendance is ${attendancePercent.toFixed(1)}% over the last ${lookbackDays} days (threshold: ${minPercent}%).`,
  };
}

function evaluateMeetingFrequencyRule(
  rule: ProjectWarningRuleConfig,
  team: TeamWarningSignalSnapshot,
  now: Date,
): EvaluatedTeamWarning | null {
  const lookbackDays = getLookbackDays(rule, 28);
  const minPerWeek = Math.max(0, normalizeNumber(rule.params?.minPerWeek, 1));
  const severity = getSeverity(rule, "MEDIUM");

  const meetings = team.meetings.filter((meeting) => isWithinLookback(meeting.date, now, lookbackDays));
  const meetingCount = meetings.length;
  const meetingRate = meetingCount / (lookbackDays / 7);
  if (meetingRate >= minPerWeek) return null;

  return {
    teamId: team.id,
    type: "MEETING_FREQUENCY",
    severity,
    title: "Meeting frequency below threshold",
    details: `${meetingCount} meeting(s) logged in the last ${lookbackDays} days (${meetingRate.toFixed(2)} per week, required: ${minPerWeek}).`,
  };
}

export function getMaxLookbackDays(config: ProjectWarningsConfig): number {
  let maxLookback = 1;
  for (const rule of config.rules) {
    if (!rule.enabled) continue;
    if (rule.key === "LOW_ATTENDANCE") {
      maxLookback = Math.max(maxLookback, getLookbackDays(rule, 30));
    } else if (rule.key === "MEETING_FREQUENCY") {
      maxLookback = Math.max(maxLookback, getLookbackDays(rule, 28));
    }
  }
  return maxLookback;
}

export function evaluateWarningsForTeams(
  config: ProjectWarningsConfig,
  teams: TeamWarningSignalSnapshot[],
  now: Date = new Date(),
): WarningEvaluationResult {
  const warnings: EvaluatedTeamWarning[] = [];
  const skippedRuleKeys = new Set<string>();

  for (const rule of config.rules) {
    if (!rule.enabled) continue;

    if (rule.key === "LOW_ATTENDANCE") {
      for (const team of teams) {
        const warning = evaluateLowAttendanceRule(rule, team, now);
        if (warning) warnings.push(warning);
      }
      continue;
    }

    if (rule.key === "MEETING_FREQUENCY") {
      for (const team of teams) {
        const warning = evaluateMeetingFrequencyRule(rule, team, now);
        if (warning) warnings.push(warning);
      }
      continue;
    }

    skippedRuleKeys.add(rule.key);
  }

  return {
    warnings,
    skippedRuleKeys: Array.from(skippedRuleKeys),
  };
}
