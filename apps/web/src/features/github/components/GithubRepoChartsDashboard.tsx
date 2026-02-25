"use client";

import type React from "react";
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
import type { GithubLatestSnapshot, GithubMappingCoverage } from "../types";

type GithubRepoChartsDashboardProps = {
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  coverage: GithubMappingCoverage | null;
  currentGithubLogin: string | null;
};

const styles = {
  chartSection: {
    marginTop: 12,
    paddingTop: 4,
    borderTop: "1px solid var(--border)",
  } as React.CSSProperties,
  sectionLabel: {
    marginTop: 2,
    marginBottom: 4,
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  } as React.CSSProperties,
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 10,
    alignItems: "start",
  } as React.CSSProperties,
  chartWrap: {
    marginTop: 10,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--surface)",
  } as React.CSSProperties,
  chartColFull: { gridColumn: "1 / -1" } as React.CSSProperties,
  chartColHalf: { gridColumn: "span 6" } as React.CSSProperties,
};

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
  const bucket: Record<string, number> = {};
  for (const row of daily) {
    const wk = isoWeekKey(row.date);
    if (!wk) continue;
    bucket[wk] = (bucket[wk] || 0) + row.commits;
  }
  return Object.entries(bucket)
    .map(([week, commits]) => ({ week, commits }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

function buildCommitShareSeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined, currentGithubLogin: string | null) {
  const totalCommits = Number(snapshot?.repoStats?.[0]?.totalCommits ?? 0);
  if (!totalCommits || !currentGithubLogin || !snapshot?.userStats?.length) return [];
  const normalizedLogin = currentGithubLogin.trim().toLowerCase();
  const personalStat = snapshot.userStats.find((stat) => stat.githubLogin?.trim().toLowerCase() === normalizedLogin);
  const personalCommits = Math.max(0, Number(personalStat?.commits ?? 0));
  const restCommits = Math.max(0, totalCommits - personalCommits);
  return [
    { name: "Your commits", value: personalCommits, fill: "var(--accent-warm)" },
    { name: "Rest", value: restCommits, fill: "var(--border-strong, #9ca3af)" },
  ].filter((row) => row.value > 0);
}

function buildCoverageShareSeries(coverage: GithubMappingCoverage | null) {
  const totalCommits = Number(coverage?.coverage?.totalCommits ?? 0);
  const unmatchedCommits = Number(coverage?.coverage?.unmatchedCommits ?? 0);
  const matchedCommits = Math.max(0, totalCommits - unmatchedCommits);
  if (!totalCommits) return [];
  return [
    { name: "Matched commits", value: matchedCommits, fill: "var(--accent)" },
    { name: "Unmatched commits", value: unmatchedCommits, fill: "var(--accent-warm)" },
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
    { name: "Default branch", value: defaultCommits, fill: "var(--accent)" },
    { name: "Other branches", value: otherBranchCommits, fill: "var(--accent-warm)" },
  ].filter((row) => row.value > 0);
}

export function GithubRepoChartsDashboard({ snapshot, coverage, currentGithubLogin }: GithubRepoChartsDashboardProps) {
  const commitTimelineSeries = buildCommitTimelineSeries(snapshot, currentGithubLogin);
  const lineChangesByDaySeries = buildLineChangesByDaySeries(snapshot);
  const weeklyCommitSeries = buildWeeklyCommitSeries(snapshot);
  const commitShareSeries = buildCommitShareSeries(snapshot, currentGithubLogin);
  const coverageShareSeries = buildCoverageShareSeries(coverage);
  const branchScopeCommitShareSeries = buildBranchScopeCommitShareSeries(snapshot);

  if (
    commitTimelineSeries.length === 0 &&
    lineChangesByDaySeries.length === 0 &&
    weeklyCommitSeries.length === 0 &&
    commitShareSeries.length === 0 &&
    coverageShareSeries.length === 0 &&
    branchScopeCommitShareSeries.length === 0
  ) {
    return null;
  }

  return (
    <section style={styles.chartSection} aria-label="Repository charts">
      <p style={styles.sectionLabel}>Charts</p>
      <div style={styles.chartGrid}>
        {commitTimelineSeries.length > 0 ? (
          <div style={{ ...styles.chartWrap, ...styles.chartColFull }}>
            <p className="muted" style={{ marginBottom: 6 }}>Commits over time (total vs your commits)</p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commitTimelineSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="commits" name="Total commits" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="personalCommits" name="Your commits" stroke="var(--accent-warm)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {lineChangesByDaySeries.length > 0 ? (
          <div style={{ ...styles.chartWrap, ...styles.chartColFull }}>
            <p className="muted" style={{ marginBottom: 6 }}>Additions and deletions over time (default branch)</p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineChangesByDaySeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)" }} />
                  <YAxis tick={{ fill: "var(--muted)" }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [Math.abs(Number(value)), name]}
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
          <div style={{ ...styles.chartWrap, ...styles.chartColHalf }}>
            <p className="muted" style={{ marginBottom: 6 }}>Weekly commit totals</p>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyCommitSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fill: "var(--muted)" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="commits" name="Commits" fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {branchScopeCommitShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Default vs other branches (commit share)"
            data={branchScopeCommitShareSeries}
            style={{ ...styles.chartWrap, ...styles.chartColHalf }}
          />
        ) : null}

        {commitShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Commit share (you vs rest)"
            data={commitShareSeries}
            style={{ ...styles.chartWrap, ...styles.chartColHalf }}
          />
        ) : null}

        {coverageShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Mapping coverage (matched vs unmatched)"
            data={coverageShareSeries}
            style={{ ...styles.chartWrap, ...styles.chartColHalf }}
          />
        ) : null}
      </div>
    </section>
  );
}
