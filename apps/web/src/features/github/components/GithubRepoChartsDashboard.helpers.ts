import type { GithubLatestSnapshot, GithubMappingCoverage } from "../types";

export const CHART_COLOR_COMMITS = "#2f81f7";
export const CHART_COLOR_ADDITIONS = "#22c55e";
export const CHART_COLOR_DELETIONS = "#f97316";
export const CHART_COLOR_MUTED = "#94a3b8";

export type ContributorRow = {
  key: string;
  rank: number;
  name: string;
  login: string | null;
  commits: number;
  additions: number;
  deletions: number;
  commitsByDay: Record<string, number> | null;
};

export function formatShortDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateRange(start: string, end: string) {
  if (!start || !end) return "";
  if (start === end) return formatShortDate(start);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

export function formatWeekRangeLabel(start: string, end: string) {
  if (!start || !end) return "";
  if (start === end) return formatShortDate(start);

  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} - ${end}`;
  }

  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
  const sameMonth = sameYear && startDate.getUTCMonth() === endDate.getUTCMonth();

  const startMonth = startDate.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
  const endMonth = endDate.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();

  if (sameMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  if (sameYear) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }

  return `${startMonth} ${startDay}, ${startDate.getUTCFullYear()} - ${endMonth} ${endDay}, ${endDate.getUTCFullYear()}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString();
}

function toNonNegativeNumber(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}

function sumCountMapValues(countMap: Record<string, number> | null | undefined) {
  if (!countMap || typeof countMap !== "object") {
    return 0;
  }
  return Object.values(countMap).reduce((sum, value) => sum + toNonNegativeNumber(value), 0);
}

export function getSnapshotRepoTotals(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const repoStats = snapshot?.repoStats?.[0];
  const defaultBranchStats = snapshot?.data?.branchScopeStats?.defaultBranch;
  const userStats = snapshot?.userStats ?? [];

  const repoCommitsByDayTotal = sumCountMapValues(repoStats?.commitsByDay);
  const userTotalAdditions = userStats.reduce((sum, row) => sum + toNonNegativeNumber(row.additions), 0);
  const userTotalDeletions = userStats.reduce((sum, row) => sum + toNonNegativeNumber(row.deletions), 0);
  const contributorCountFromUsers = userStats.length;

  const totalCommits = Math.max(
    toNonNegativeNumber(repoStats?.totalCommits),
    toNonNegativeNumber(defaultBranchStats?.totalCommits),
    repoCommitsByDayTotal
  );
  const totalAdditions = Math.max(
    toNonNegativeNumber(repoStats?.totalAdditions),
    toNonNegativeNumber(defaultBranchStats?.totalAdditions),
    userTotalAdditions
  );
  const totalDeletions = Math.max(
    toNonNegativeNumber(repoStats?.totalDeletions),
    toNonNegativeNumber(defaultBranchStats?.totalDeletions),
    userTotalDeletions
  );
  const totalContributors = Math.max(
    toNonNegativeNumber(repoStats?.totalContributors),
    contributorCountFromUsers
  );

  return {
    totalCommits,
    totalAdditions,
    totalDeletions,
    totalContributors,
  };
}

export function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return "0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function listContinuousDayKeys(startDay: string, endDay: string) {
  const start = new Date(`${startDay}T00:00:00Z`);
  const end = new Date(`${endDay}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [] as string[];
  }

  const days: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function resolveTimelineBoundsFromDayMaps(dayMaps: Array<Record<string, unknown> | null | undefined>) {
  const dayKeys = new Set<string>();
  for (const map of dayMaps) {
    if (!map || typeof map !== "object") {
      continue;
    }
    for (const key of Object.keys(map)) {
      if (key) dayKeys.add(key);
    }
  }

  const sorted = Array.from(dayKeys).sort((a, b) => a.localeCompare(b));
  if (sorted.length <= 0) {
    return null as { start: string; end: string } | null;
  }

  return {
    start: sorted[0],
    end: sorted[sorted.length - 1],
  };
}

function trimSeriesEdges<T>(series: T[], isEmpty: (value: T) => boolean) {
  if (series.length <= 0) {
    return series;
  }

  let start = 0;
  let end = series.length - 1;

  while (start <= end && isEmpty(series[start])) {
    start += 1;
  }

  while (end >= start && isEmpty(series[end])) {
    end -= 1;
  }

  if (start > end) {
    return [] as T[];
  }

  return series.slice(start, end + 1);
}

export function isoWeekKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getCommitsByDaySeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const commitsByDay = snapshot?.repoStats?.[0]?.commitsByDay;
  if (!commitsByDay || typeof commitsByDay !== "object") {
    return [] as Array<{ date: string; commits: number }>;
  }
  return Object.entries(commitsByDay)
    .map(([date, commits]) => ({ date, commits: Number(commits) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findPersonalStat(
  snapshot: GithubLatestSnapshot["snapshot"] | null | undefined,
  currentGithubLogin: string | null
) {
  const normalizedLogin = currentGithubLogin?.trim().toLowerCase();
  if (!normalizedLogin || !snapshot?.userStats?.length) {
    return null;
  }

  return (
    snapshot.userStats.find((stat) => stat.githubLogin?.trim().toLowerCase() === normalizedLogin) ||
    null
  );
}

export function buildCommitTimelineSeries(
  snapshot: GithubLatestSnapshot["snapshot"] | null | undefined,
  currentGithubLogin: string | null,
  options?: { includePersonal?: boolean }
) {
  const includePersonal = options?.includePersonal ?? true;
  const totalSeries = getCommitsByDaySeries(snapshot);
  const totalByDay = new Map(totalSeries.map((row) => [row.date, row.commits]));
  const personalByDay = findPersonalStat(snapshot, currentGithubLogin)?.commitsByDay || {};
  const bounds = resolveTimelineBoundsFromDayMaps([
    snapshot?.repoStats?.[0]?.commitsByDay ?? null,
    personalByDay,
  ]);

  if (!bounds) {
    return trimSeriesEdges(
      totalSeries.map((item) => ({
        date: item.date,
        commits: item.commits,
        personalCommits: includePersonal ? Number(personalByDay[item.date]) || 0 : undefined,
      })),
      (item) => Number(item.commits ?? 0) <= 0 && Number(item.personalCommits ?? 0) <= 0
    );
  }

  const dayKeys = listContinuousDayKeys(bounds.start, bounds.end);

  return trimSeriesEdges(
    dayKeys.map((date) => ({
      date,
      commits: Number(totalByDay.get(date) ?? 0),
      personalCommits: includePersonal ? Number(personalByDay[date]) || 0 : undefined,
    })),
    (item) => Number(item.commits ?? 0) <= 0 && Number(item.personalCommits ?? 0) <= 0
  );
}

export function buildLineChangesByDaySeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const byDay = snapshot?.data?.timeSeries?.defaultBranch?.lineChangesByDay;
  const sourceEntries = byDay && typeof byDay === "object" ? Object.entries(byDay) : [];

  const normalizedByDay = new Map(
    sourceEntries.map(([date, values]) => [
      date,
      {
        additions: Number(values?.additions ?? 0),
        deletions: -Math.abs(Number(values?.deletions ?? 0)),
      },
    ])
  );

  const bounds = resolveTimelineBoundsFromDayMaps([byDay ?? null]);
  const dayKeys = bounds
    ? listContinuousDayKeys(bounds.start, bounds.end)
    : Array.from(normalizedByDay.keys()).sort((a, b) => a.localeCompare(b));

  if (dayKeys.length <= 0) {
    return [] as Array<{ date: string; additions: number; deletions: number }>;
  }

  return trimSeriesEdges(
    dayKeys.map((date) => ({
      date,
      additions: Number(normalizedByDay.get(date)?.additions ?? 0),
      deletions: Number(normalizedByDay.get(date)?.deletions ?? 0),
    })),
    (item) => Number(item.additions ?? 0) === 0 && Number(item.deletions ?? 0) === 0
  );
}

export function buildWeeklyCommitSeries(dailySeries: Array<{ date: string; commits: number }>) {
  const bucket: Record<string, { commits: number; start: string; end: string }> = {};

  for (const row of dailySeries) {
    const wk = isoWeekKey(row.date);
    if (!wk) continue;
    if (!bucket[wk]) {
      bucket[wk] = { commits: row.commits, start: row.date, end: row.date };
      continue;
    }

    bucket[wk].commits += row.commits;
    if (row.date < bucket[wk].start) bucket[wk].start = row.date;
    if (row.date > bucket[wk].end) bucket[wk].end = row.date;
  }

  return Object.entries(bucket)
    .map(([weekKey, stats]) => ({
      weekKey,
      weekLabel: formatWeekRangeLabel(stats.start, stats.end),
      rangeStart: stats.start,
      rangeEnd: stats.end,
      commits: stats.commits,
    }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

export function buildContributorRows(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined): ContributorRow[] {
  const stats = snapshot?.userStats ?? [];

  const sorted = stats
    .filter((row) => Number(row.commits ?? 0) > 0)
    .map((row, index) => ({
      key: `${row.githubLogin || "unknown"}-${row.mappedUserId ?? "none"}-${index}`,
      rank: 0,
      name:
        row.githubLogin ||
        (row.isMatched ? `User ${row.mappedUserId ?? ""}`.trim() : "Unknown / Unmatched"),
      login: row.githubLogin || null,
      commits: Number(row.commits ?? 0),
      additions: Number(row.additions ?? 0),
      deletions: Number(row.deletions ?? 0),
      commitsByDay: row.commitsByDay || null,
    }))
    .sort((a, b) => b.commits - a.commits);

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export function buildTopContributorBarSeries(contributors: ContributorRow[]) {
  return contributors.map((row) => ({ contributor: row.name, commits: row.commits }));
}

export function buildContributorMiniSeries(commitsByDay: Record<string, number> | null) {
  if (!commitsByDay || typeof commitsByDay !== "object") {
    return [] as Array<{ date: string; commits: number }>;
  }

  return Object.entries(commitsByDay)
    .map(([date, commits]) => ({ date, commits: Number(commits) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10);
}

export function buildBranchScopeCommitShareSeries(
  snapshot: GithubLatestSnapshot["snapshot"] | null | undefined
) {
  const defaultCommits = Number(snapshot?.data?.branchScopeStats?.defaultBranch?.totalCommits ?? 0);
  const allCommits = Number(snapshot?.data?.branchScopeStats?.allBranches?.totalCommits ?? 0);
  const otherBranchCommits = Math.max(0, allCommits - defaultCommits);

  if (allCommits <= 0) return [];

  return [
    { name: "Default branch", value: defaultCommits, fill: CHART_COLOR_COMMITS },
    { name: "Other branches", value: otherBranchCommits, fill: CHART_COLOR_ADDITIONS },
  ].filter((row) => row.value > 0);
}

export function buildPersonalShareSeries(params: {
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  currentGithubLogin: string | null;
}) {
  const { snapshot, currentGithubLogin } = params;
  const personalStat = findPersonalStat(snapshot, currentGithubLogin);
  const totals = getSnapshotRepoTotals(snapshot);
  const totalCommits = totals.totalCommits;
  const totalLineChanges = totals.totalAdditions + totals.totalDeletions;
  const personalCommits = Number(personalStat?.commits ?? 0);
  const personalLineChanges =
    Number(personalStat?.additions ?? 0) + Number(personalStat?.deletions ?? 0);

  const commitShare =
    totalCommits > 0
      ? [
          { name: "You", value: personalCommits, fill: CHART_COLOR_COMMITS },
          { name: "Team", value: Math.max(0, totalCommits - personalCommits), fill: CHART_COLOR_MUTED },
        ]
      : [];

  const lineShare =
    totalLineChanges > 0
      ? [
          { name: "You", value: personalLineChanges, fill: CHART_COLOR_ADDITIONS },
          { name: "Team", value: Math.max(0, totalLineChanges - personalLineChanges), fill: CHART_COLOR_MUTED },
        ]
      : [];

  return {
    commitShare,
    lineShare,
    totalCommits,
    totalLineChanges,
    personalCommits,
    personalLineChanges,
  };
}

export function buildCoverageShareSeries(coverage: GithubMappingCoverage | null) {
  const totalCommits = Number(coverage?.coverage?.totalCommits ?? 0);
  const unmatchedCommits = Number(coverage?.coverage?.unmatchedCommits ?? 0);
  const matchedCommits = Math.max(0, totalCommits - unmatchedCommits);

  if (!totalCommits) return [];

  return [
    { name: "Matched commits", value: matchedCommits, fill: CHART_COLOR_ADDITIONS },
    { name: "Unmatched commits", value: unmatchedCommits, fill: CHART_COLOR_DELETIONS },
  ];
}

export function getLineChangeDomain(
  lineChangesByDaySeries: Array<{ additions: number; deletions: number }>
) {
  const maxAbs = lineChangesByDaySeries.reduce((acc, row) => {
    const rowMax = Math.max(Math.abs(row.additions), Math.abs(row.deletions));
    return Math.max(acc, rowMax);
  }, 0);

  if (maxAbs === 0) return undefined;
  return [-maxAbs, maxAbs] as const;
}

export function getChartMinWidth(points: number, options?: { base?: number; pointWidth?: number; max?: number }) {
  const base = options?.base ?? 720;
  const pointWidth = options?.pointWidth ?? 54;
  const max = options?.max ?? 1600;
  return Math.min(max, Math.max(base, points * pointWidth));
}

export function getDateTickInterval(points: number, options?: { maxTicks?: number }) {
  const maxTicks = options?.maxTicks ?? 12;
  if (points <= maxTicks) return 0;
  return Math.max(1, Math.ceil(points / maxTicks) - 1);
}

export function getContributorAxisWidth(contributors: ContributorRow[]) {
  const longest = contributors.reduce((max, row) => Math.max(max, row.name.length), 0);
  return Math.min(300, Math.max(140, longest * 7.2));
}
