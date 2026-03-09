"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GithubDonutChartCard } from "./GithubDonutChartCard";
import { GithubChartTitleWithInfo } from "./GithubChartInfo";
import { githubRepoChartInfo as chartInfo } from "./GithubRepoChartsDashboard.info";
import type { GithubLatestSnapshot, GithubMappingCoverage } from "../types";

type GithubRepoChartsDashboardProps = {
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  coverage: GithubMappingCoverage | null;
  currentGithubLogin: string | null;
  viewerMode?: "student" | "staff";
};

const CHART_COLOR_PRIMARY = "#36c98f";
const CHART_COLOR_SECONDARY = "#f59b3a";


function getCommitsByDaySeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const commitsByDay = snapshot?.repoStats?.[0]?.commitsByDay;
  if (!commitsByDay || typeof commitsByDay !== "object") {
    return [];
  }
  return Object.entries(commitsByDay)
    .map(([date, commits]) => ({ date, commits: Number(commits) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getPersonalCommitsByDay(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined, currentGithubLogin: string | null) {
  const normalizedLogin = currentGithubLogin?.trim().toLowerCase();
  if (!normalizedLogin || !snapshot?.userStats?.length) {
    return {};
  }
  const personalStat = snapshot.userStats.find((stat) => stat.githubLogin?.trim().toLowerCase() === normalizedLogin);
  const commitsByDay = personalStat?.commitsByDay;
  return commitsByDay && typeof commitsByDay === "object" ? commitsByDay : {};
}

function buildCommitTimelineSeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined, currentGithubLogin: string | null) {
  const totalSeries = getCommitsByDaySeries(snapshot);
  const personalByDay = getPersonalCommitsByDay(snapshot, currentGithubLogin);
  return totalSeries.map((item) => ({
    date: item.date,
    commits: item.commits,
    personalCommits: Number(personalByDay[item.date]) || 0,
  }));
}

function buildLineChangesByDaySeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const byDay = snapshot?.data?.timeSeries?.defaultBranch?.lineChangesByDay;
  if (!byDay || typeof byDay !== "object") {
    return [];
  }
  return Object.entries(byDay)
    .map(([date, values]) => ({
      date,
      additions: Number(values?.additions ?? 0),
      deletions: -Math.abs(Number(values?.deletions ?? 0)),
      net: Number(values?.additions ?? 0) - Number(values?.deletions ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function isoWeekKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function buildWeeklyCommitSeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const daily = getCommitsByDaySeries(snapshot);
  const bucket: Record<string, { commits: number; start: string; end: string }> = {};
  for (const row of daily) {
    const wk = isoWeekKey(row.date);
    if (!wk) continue;
    const existing = bucket[wk];
    if (!existing) {
      bucket[wk] = { commits: row.commits, start: row.date, end: row.date };
      continue;
    }
    existing.commits += row.commits;
    if (row.date < existing.start) existing.start = row.date;
    if (row.date > existing.end) existing.end = row.date;
  }
  return Object.entries(bucket)
    .map(([weekKey, stats]) => ({
      weekKey,
      weekLabel: formatShortDate(stats.start),
      rangeStart: stats.start,
      rangeEnd: stats.end,
      commits: stats.commits,
    }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

function buildCoverageShareSeries(coverage: GithubMappingCoverage | null) {
  const totalCommits = Number(coverage?.coverage?.totalCommits ?? 0);
  const unmatchedCommits = Number(coverage?.coverage?.unmatchedCommits ?? 0);
  const matchedCommits = Math.max(0, totalCommits - unmatchedCommits);
  if (!totalCommits) return [];
  return [
    { name: "Matched commits", value: matchedCommits, fill: CHART_COLOR_PRIMARY },
    { name: "Unmatched commits", value: unmatchedCommits, fill: CHART_COLOR_SECONDARY },
  ];
}

function buildBranchScopeCommitShareSeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const defaultCommits = Number(snapshot?.data?.branchScopeStats?.defaultBranch?.totalCommits ?? 0);
  const allCommits = Number(snapshot?.data?.branchScopeStats?.allBranches?.totalCommits ?? 0);
  const otherBranchCommits = Math.max(0, allCommits - defaultCommits);

  if (allCommits <= 0) {
    return [];
  }

  return [
    { name: "Default branch", value: defaultCommits, fill: CHART_COLOR_PRIMARY },
    { name: "Other branches", value: otherBranchCommits, fill: CHART_COLOR_SECONDARY },
  ].filter((row) => row.value > 0);
}

function buildTopContributorsSeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const stats = snapshot?.userStats ?? [];
  const mapped = stats
    .filter((row) => row.isMatched)
    .map((row) => ({
      contributor: row.githubLogin || `User ${row.mappedUserId ?? ""}`.trim(),
      commits: Number(row.commits ?? 0),
    }))
    .filter((row) => row.commits > 0)
    .sort((a, b) => b.commits - a.commits);

  const unmatchedCommits = stats
    .filter((row) => !row.isMatched)
    .reduce((sum, row) => sum + Number(row.commits ?? 0), 0);

  if (unmatchedCommits > 0) {
    mapped.push({
      contributor: "Unmapped / others",
      commits: unmatchedCommits,
    });
  }

  return mapped;
}

function formatShortDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateRange(start: string, end: string) {
  if (!start || !end) return "";
  if (start === end) return formatShortDate(start);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function countActiveDays(dailySeries: Array<{ date: string; commits: number }>) {
  return dailySeries.filter((row) => row.commits > 0).length;
}

function buildDerivedSignals(params: {
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  coverage: GithubMappingCoverage | null;
  commitTimelineSeries: Array<{ date: string; commits: number; personalCommits: number }>;
  weeklyCommitSeries: Array<{ commits: number }>;
}) {
  const { snapshot, coverage, commitTimelineSeries, weeklyCommitSeries } = params;

  const totalCommits = Number(snapshot?.repoStats?.[0]?.totalCommits ?? 0);
  const totalContributors = Number(snapshot?.repoStats?.[0]?.totalContributors ?? 0);
  const personalCommits = commitTimelineSeries.reduce((sum, row) => sum + (row.personalCommits || 0), 0);
  const activeDays = countActiveDays(commitTimelineSeries);
  const weeksWithCommits = weeklyCommitSeries.filter((row) => row.commits > 0).length;
  const totalWeeks = Math.max(weeklyCommitSeries.length, 1);
  const matchedRatio = coverage?.coverage?.totalCommits
    ? (coverage.coverage.totalCommits - coverage.coverage.unmatchedCommits) / coverage.coverage.totalCommits
    : 0;
  const personalShare = totalCommits > 0 ? personalCommits / totalCommits : 0;
  const consistencyScore = clampScore((weeksWithCommits / totalWeeks) * 10);
  const visibilityScore = clampScore(matchedRatio * 10);
  const participationScore = clampScore(Math.min(1, personalShare * 2.5) * 10);
  const overallSignal = clampScore((consistencyScore + visibilityScore + participationScore) / 3);

  return {
    overallSignal,
    consistencyScore,
    visibilityScore,
    participationScore,
    activeDays,
    weeksWithCommits,
    totalWeeks,
    personalCommits,
    totalCommits,
    totalContributors,
  };
}

export function GithubRepoChartsDashboard({
  snapshot,
  coverage,
  currentGithubLogin,
  viewerMode = "student",
}: GithubRepoChartsDashboardProps) {
  const isStaffView = viewerMode === "staff";
  const commitTimelineSeries = buildCommitTimelineSeries(snapshot, currentGithubLogin);
  const lineChangesByDaySeries = buildLineChangesByDaySeries(snapshot);
  const weeklyCommitSeries = buildWeeklyCommitSeries(snapshot);
  const coverageShareSeries = buildCoverageShareSeries(coverage);
  const branchScopeCommitShareSeries = buildBranchScopeCommitShareSeries(snapshot);
  const topContributorsSeries = buildTopContributorsSeries(snapshot);
  const signals = buildDerivedSignals({
    snapshot,
    coverage,
    commitTimelineSeries,
    weeklyCommitSeries,
  });

  if (
    commitTimelineSeries.length === 0 &&
    lineChangesByDaySeries.length === 0 &&
    weeklyCommitSeries.length === 0 &&
    coverageShareSeries.length === 0 &&
    branchScopeCommitShareSeries.length === 0 &&
    topContributorsSeries.length === 0
  ) {
    return null;
  }

  return (
    <section className="github-chart-section" aria-label="Repository charts">
      <p className="github-chart-section__label">Charts</p>
      <div className="github-chart-section__insights">
        <div className="github-chart-section__insight">
          <div className="github-chart-section__insight-label">Overall contribution signal</div>
          <div className="github-chart-section__insight-value">{signals.overallSignal}/10</div>
          <div className="github-chart-section__insight-subtext">Heuristic only, not a grade</div>
        </div>
        <div className="github-chart-section__insight">
          <div className="github-chart-section__insight-label">Consistency signal</div>
          <div className="github-chart-section__insight-value">{signals.consistencyScore}/10</div>
          <div className="github-chart-section__insight-subtext">
            {signals.weeksWithCommits}/{signals.totalWeeks} active weeks
          </div>
        </div>
        <div className="github-chart-section__insight">
          <div className="github-chart-section__insight-label">Mapping visibility</div>
          <div className="github-chart-section__insight-value">{signals.visibilityScore}/10</div>
          <div className="github-chart-section__insight-subtext">
            {coverage?.coverage?.unmatchedCommits ?? 0} unmatched commits
          </div>
        </div>
        {isStaffView ? (
          <div className="github-chart-section__insight">
            <div className="github-chart-section__insight-label">Active coding days</div>
            <div className="github-chart-section__insight-value">{signals.activeDays}</div>
            <div className="github-chart-section__insight-subtext">Days with at least one commit</div>
          </div>
        ) : (
          <div className="github-chart-section__insight">
            <div className="github-chart-section__insight-label">Personal activity share</div>
            <div className="github-chart-section__insight-value">{signals.participationScore}/10</div>
            <div className="github-chart-section__insight-subtext">
              {signals.personalCommits}/{signals.totalCommits || 0} commits
            </div>
          </div>
        )}
      </div>
      <div className="github-chart-section__grid">
        {commitTimelineSeries.length > 0 ? (
          <div className="github-chart-section__panel github-chart-section__panel--full">
            <GithubChartTitleWithInfo
              title={isStaffView ? "Commits over time (team total)" : "Commits over time (total vs your commits)"}
              info={chartInfo.commitsTimeline}
            />
            <div className="github-chart-section__canvas github-chart-section__canvas--xl">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commitTimelineSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)" }} tickFormatter={formatShortDate} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="commits" name="Total commits" stroke={CHART_COLOR_PRIMARY} strokeWidth={2} dot={false} />
                  {!isStaffView ? (
                    <Line type="monotone" dataKey="personalCommits" name="Your commits" stroke={CHART_COLOR_SECONDARY} strokeWidth={2} dot={false} />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {lineChangesByDaySeries.length > 0 ? (
          <div className="github-chart-section__panel github-chart-section__panel--full">
            <GithubChartTitleWithInfo
              title="Additions and deletions over time (default branch)"
              info={chartInfo.lineChanges}
            />
            <div className="github-chart-section__canvas github-chart-section__canvas--xl">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineChangesByDaySeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)" }} tickFormatter={formatShortDate} />
                  <YAxis tick={{ fill: "var(--muted)" }} />
                  <Tooltip
                    formatter={(value, name) => [Math.abs(Number(value ?? 0)), name]}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <Legend />
                  <Bar dataKey="additions" name="Additions" fill="#36c98f" />
                  <Bar dataKey="deletions" name="Deletions" fill="#f59b3a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {weeklyCommitSeries.length > 0 ? (
          <div className="github-chart-section__panel github-chart-section__panel--half">
            <GithubChartTitleWithInfo title="Weekly commit totals" info={chartInfo.weeklyCommits} />
            <div className="github-chart-section__canvas github-chart-section__canvas--md">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyCommitSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="weekLabel" tick={{ fill: "var(--muted)" }} interval="preserveStartEnd" minTickGap={22} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)" }} />
                  <Tooltip
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { rangeStart?: string; rangeEnd?: string } | undefined;
                      return row?.rangeStart && row?.rangeEnd
                        ? `Week: ${formatDateRange(row.rangeStart, row.rangeEnd)}`
                        : "Week";
                    }}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <Bar dataKey="commits" name="Commits" fill={CHART_COLOR_PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {topContributorsSeries.length > 0 ? (
          <div className="github-chart-section__panel github-chart-section__panel--half">
            <GithubChartTitleWithInfo title="Top contributors by commits" info={chartInfo.topContributors} />
            <div className="github-chart-section__canvas github-chart-section__canvas--md">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topContributorsSeries} layout="vertical" margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted)" }} />
                  <YAxis type="category" dataKey="contributor" width={110} tick={{ fill: "var(--muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="commits" name="Commits" fill={CHART_COLOR_PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {branchScopeCommitShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Default vs other branches (commit share)"
            data={branchScopeCommitShareSeries}
            info={chartInfo.branchScope}
            className="github-chart-section__panel github-chart-section__panel--half"
          />
        ) : null}

        {coverageShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Mapping coverage (matched vs unmatched)"
            data={coverageShareSeries}
            info={chartInfo.mappingCoverage}
            className="github-chart-section__panel github-chart-section__panel--half"
          />
        ) : null}
      </div>
    </section>
  );
}
