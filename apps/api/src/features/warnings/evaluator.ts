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
  commitsByDay: Record<string, number>;
  totalCommits: number;
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
const ENTIRE_PROJECT_LOOKBACK_SENTINEL = -1;
const ENTIRE_PROJECT_LOOKBACK_DAYS = 3650;

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function getLookbackDays(rule: ProjectWarningRuleConfig, fallback: number): number {
  const raw = rule.params?.lookbackDays;
  if (normalizeNumber(raw, fallback) === ENTIRE_PROJECT_LOOKBACK_SENTINEL) {
    return ENTIRE_PROJECT_LOOKBACK_DAYS;
  }
  const value = Math.floor(normalizeNumber(raw, fallback));
  return Math.min(ENTIRE_PROJECT_LOOKBACK_DAYS, Math.max(1, value));
}

function isEntireProjectLookback(rule: ProjectWarningRuleConfig): boolean {
  return normalizeNumber(rule.params?.lookbackDays, 0) === ENTIRE_PROJECT_LOOKBACK_SENTINEL;
}

function getGraceDays(rule: ProjectWarningRuleConfig, fallbackLookbackDays: number): number {
  const explicitGraceDays = normalizeNumber(rule.params?.graceDays, Number.NaN);
  if (Number.isFinite(explicitGraceDays)) {
    return Math.max(0, Math.floor(explicitGraceDays));
  }

  if (isEntireProjectLookback(rule)) {
    return 0;
  }

  return fallbackLookbackDays;
}

function isRuleEligibleByProjectAge(
  rule: ProjectWarningRuleConfig,
  fallbackLookbackDays: number,
  projectStartDate: Date | null,
  now: Date,
): boolean {
  if (!projectStartDate) return true;
  const graceDays = getGraceDays(rule, fallbackLookbackDays);
  if (graceDays <= 0) return true;
  const eligibleAt = projectStartDate.getTime() + graceDays * 24 * 60 * 60 * 1000;
  return now.getTime() >= eligibleAt;
}

function formatLookbackLabel(rule: ProjectWarningRuleConfig, lookbackDays: number): string {
  if (isEntireProjectLookback(rule)) return "since project start";
  return `over the last ${lookbackDays} days`;
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
  const entireProject = isEntireProjectLookback(rule);

  const meetings = entireProject
    ? team.meetings
    : team.meetings.filter((meeting) => isWithinLookback(meeting.date, now, lookbackDays));
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
    details: `Attendance is ${attendancePercent.toFixed(1)}% ${formatLookbackLabel(rule, lookbackDays)} (threshold: ${minPercent}%).`,
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
  const entireProject = isEntireProjectLookback(rule);

  const meetings = entireProject
    ? team.meetings
    : team.meetings.filter((meeting) => isWithinLookback(meeting.date, now, lookbackDays));
  const meetingCount = meetings.length;
  const windowDays = entireProject
    ? Math.max(
      7,
      meetings.length === 0
        ? 30
        : Math.ceil(
          (now.getTime() - meetings.reduce((earliest, meeting) =>
            meeting.date.getTime() < earliest.getTime() ? meeting.date : earliest,
          ).getTime()) / (24 * 60 * 60 * 1000),
        ),
    )
    : lookbackDays;
  const recommendedMeetingCount = Math.max(0, Math.ceil((minPerWeek * windowDays) / 7));
  if (meetingCount >= recommendedMeetingCount) return null;

  return {
    teamId: team.id,
    type: "MEETING_FREQUENCY",
    severity,
    title: "Meeting activity below recommendation",
    details: `${meetingCount} meeting(s) logged ${formatLookbackLabel(rule, windowDays)}. Recommended minimum: ${recommendedMeetingCount}.`,
  };
}

function evaluateLowContributionActivityRule(
  rule: ProjectWarningRuleConfig,
  team: TeamWarningSignalSnapshot,
  now: Date,
): EvaluatedTeamWarning | null {
  const lookbackDays = getLookbackDays(rule, 14);
  const minCommits = Math.max(0, normalizeNumber(rule.params?.minCommits, 4));
  const severity = getSeverity(rule, "MEDIUM");
  const entireProject = isEntireProjectLookback(rule);
  const commitsByDay = team.commitsByDay ?? {};

  let commitCount = 0;
  if (entireProject) {
    if (Object.keys(commitsByDay).length > 0) {
      commitCount = Object.values(commitsByDay).reduce((sum, value) => sum + value, 0);
    } else {
      commitCount = team.totalCommits ?? 0;
    }
  } else {
    const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
    for (const [dayKey, value] of Object.entries(commitsByDay)) {
      const parsedDate = new Date(`${dayKey}T00:00:00.000Z`);
      if (Number.isNaN(parsedDate.getTime())) continue;
      if (parsedDate.getTime() >= cutoff) {
        commitCount += value;
      }
    }
  }

  if (commitCount >= minCommits) return null;

  return {
    teamId: team.id,
    type: "LOW_CONTRIBUTION_ACTIVITY",
    severity,
    title: "Contribution activity below recommendation",
    details: `${commitCount} commit(s) logged ${formatLookbackLabel(rule, lookbackDays)}. Recommended minimum: ${minCommits}.`,
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
    } else if (rule.key === "LOW_CONTRIBUTION_ACTIVITY" || rule.key === "LOW_COMMIT_ACTIVITY") {
      maxLookback = Math.max(maxLookback, getLookbackDays(rule, 14));
    }
  }
  return maxLookback;
}

export function evaluateWarningsForTeams(
  config: ProjectWarningsConfig,
  teams: TeamWarningSignalSnapshot[],
  now: Date = new Date(),
  projectStartDate: Date | null = null,
): WarningEvaluationResult {
  const warnings: EvaluatedTeamWarning[] = [];
  const skippedRuleKeys = new Set<string>();

  for (const rule of config.rules) {
    if (!rule.enabled) continue;

    if (rule.key === "LOW_ATTENDANCE") {
      if (!isRuleEligibleByProjectAge(rule, 30, projectStartDate, now)) continue;
      for (const team of teams) {
        const warning = evaluateLowAttendanceRule(rule, team, now);
        if (warning) warnings.push(warning);
      }
      continue;
    }

    if (rule.key === "MEETING_FREQUENCY") {
      if (!isRuleEligibleByProjectAge(rule, 28, projectStartDate, now)) continue;
      for (const team of teams) {
        const warning = evaluateMeetingFrequencyRule(rule, team, now);
        if (warning) warnings.push(warning);
      }
      continue;
    }

    if (rule.key === "LOW_CONTRIBUTION_ACTIVITY" || rule.key === "LOW_COMMIT_ACTIVITY") {
      if (!isRuleEligibleByProjectAge(rule, 14, projectStartDate, now)) continue;
      for (const team of teams) {
        const warning = evaluateLowContributionActivityRule(rule, team, now);
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
