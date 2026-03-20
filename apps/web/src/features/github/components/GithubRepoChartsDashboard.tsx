"use client";

import { useEffect, useMemo, useState } from "react";
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
import { GithubChartCard } from "./GithubChartCard";
import { GithubContributorCard } from "./GithubContributorCard";
import { githubRepoChartInfo as chartInfo } from "./GithubRepoChartsDashboard.info";
import {
  buildBranchScopeCommitShareSeries,
  buildCommitTimelineSeries,
  buildContributorRows,
  buildCoverageShareSeries,
  buildLineChangesByDaySeries,
  buildPersonalShareSeries,
  buildWeeklyCommitSeries,
  CHART_COLOR_ADDITIONS,
  CHART_COLOR_COMMITS,
  CHART_COLOR_DELETIONS,
  formatDateRange,
  formatNumber,
  formatPercent,
  formatShortDate,
  getDateTickInterval,
  getChartMinWidth,
  getLineChangeDomain,
} from "./GithubRepoChartsDashboard.helpers";
import { GithubSectionContainer } from "./GithubSectionContainer";
import type { GithubLatestSnapshot, GithubMappingCoverage } from "../types";

type ChartViewMode = "team" | "personal" | "staff";
type TeamActivityTab = "teamCharts" | "contributors" | "branchActivity";

type GithubRepoChartsDashboardProps = {
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  coverage: GithubMappingCoverage | null;
  currentGithubLogin: string | null;
  viewerMode?: "student" | "staff";
  viewMode?: ChartViewMode;
  repositoryFullName?: string | null;
};

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

function EmptyState() {
  return <p className="muted">No chart data available for this snapshot yet.</p>;
}

function RepositoryAnalyticsCharts({
  commitTimelineSeries,
  lineChangesByDaySeries,
  weeklyCommitSeries,
  lineChangeDomain,
  showPersonalCommitSeries,
}: {
  commitTimelineSeries: Array<{ date: string; commits: number; personalCommits?: number }>;
  lineChangesByDaySeries: Array<{ date: string; additions: number; deletions: number }>;
  weeklyCommitSeries: Array<{ weekKey: string; weekLabel: string; rangeStart: string; rangeEnd: string; commits: number }>;
  lineChangeDomain: readonly [number, number] | undefined;
  showPersonalCommitSeries: boolean;
}) {
  const commitsChartMinWidth = getChartMinWidth(commitTimelineSeries.length, { base: 680, pointWidth: 44 });
  const linesChartMinWidth = getChartMinWidth(lineChangesByDaySeries.length, { base: 680, pointWidth: 44 });
  const weeklyChartMinWidth = getChartMinWidth(weeklyCommitSeries.length, { base: 560, pointWidth: 68 });
  const commitTickInterval = getDateTickInterval(commitTimelineSeries.length, { maxTicks: 11 });
  const lineChangeTickInterval = getDateTickInterval(lineChangesByDaySeries.length, { maxTicks: 11 });
  const weeklyTickInterval = getDateTickInterval(weeklyCommitSeries.length, { maxTicks: 10 });

  return (
    <div className="github-chart-section__grid">
      {commitTimelineSeries.length > 0 ? (
        <GithubChartCard
          title={showPersonalCommitSeries ? "Commits over time (team vs you)" : "Commits over time"}
          info={chartInfo.commitsTimeline}
          size="full"
          minChartWidth={commitsChartMinWidth}
        >
          <div className="github-chart-section__canvas github-chart-section__canvas--xl">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={commitTimelineSeries}
                margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  interval={commitTickInterval}
                  tickMargin={14}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={formatShortDate}
                  minTickGap={18}
                  label={{ value: "Date", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)" }}
                  label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                />
                <Tooltip
                  labelFormatter={(label) => formatShortDate(String(label))}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="commits"
                  name="Team commits"
                  stroke={CHART_COLOR_COMMITS}
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={420}
                />
                {showPersonalCommitSeries ? (
                  <Line
                    type="monotone"
                    dataKey="personalCommits"
                    name="Your commits"
                    stroke={CHART_COLOR_ADDITIONS}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 3.5 }}
                    animationDuration={420}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GithubChartCard>
      ) : null}

      {lineChangesByDaySeries.length > 0 ? (
        <GithubChartCard
          title="Additions and deletions over time"
          info={chartInfo.lineChanges}
          size="full"
          minChartWidth={linesChartMinWidth}
        >
          <div className="github-chart-section__canvas github-chart-section__canvas--xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lineChangesByDaySeries}
                margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                barCategoryGap="10%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  interval={lineChangeTickInterval}
                  tickMargin={14}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={formatShortDate}
                  minTickGap={18}
                  label={{ value: "Date", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                />
                <YAxis
                  domain={lineChangeDomain}
                  tick={{ fill: "var(--muted)" }}
                  label={{ value: "Lines changed", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                />
                <Tooltip
                  labelFormatter={(label) => formatShortDate(String(label))}
                  formatter={(value, name) => [Math.abs(Number(value ?? 0)).toLocaleString(), name]}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Bar
                  dataKey="additions"
                  name="Additions"
                  fill={CHART_COLOR_ADDITIONS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  animationDuration={420}
                />
                <Bar
                  dataKey="deletions"
                  name="Deletions"
                  fill={CHART_COLOR_DELETIONS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  animationDuration={420}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GithubChartCard>
      ) : null}

      {weeklyCommitSeries.length > 0 ? (
        <GithubChartCard
          title="Weekly commit totals"
          info={chartInfo.weeklyCommits}
          size="half"
          minChartWidth={weeklyChartMinWidth}
        >
          <div className="github-chart-section__canvas github-chart-section__canvas--md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyCommitSeries}
                margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                barCategoryGap="16%"
                barGap={3}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="weekLabel"
                  interval={weeklyTickInterval}
                  tickMargin={14}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={(value) => String(value).replace(/^(\d{4})-W/, "W")}
                  minTickGap={20}
                  label={{ value: "Week", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)" }}
                  label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | { weekKey?: string; rangeStart?: string; rangeEnd?: string }
                      | undefined;
                    return row?.rangeStart && row?.rangeEnd
                      ? `Week ${row.weekKey ?? ""}: ${formatDateRange(row.rangeStart, row.rangeEnd)}`
                      : "Week";
                  }}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="commits"
                  name="Commits"
                  fill={CHART_COLOR_COMMITS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={34}
                  animationDuration={420}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GithubChartCard>
      ) : null}
    </div>
  );
}

function ContributorBreakdown({
  contributors,
  repositoryFullName,
}: {
  contributors: ReturnType<typeof buildContributorRows>;
  repositoryFullName?: string | null;
}) {
  if (contributors.length <= 0) return <EmptyState />;

  return (
    <div className="github-chart-section__contributor-grid" role="list">
      {contributors.map((contributor) => (
        <GithubContributorCard
          key={contributor.key}
          contributor={contributor}
          repositoryFullName={repositoryFullName}
        />
      ))}
    </div>
  );
}

function BranchActivity({
  branchScopeCommitShareSeries,
  coverageShareSeries,
  branchCount,
  defaultBranchName,
  commitsByBranch,
}: {
  branchScopeCommitShareSeries: ReturnType<typeof buildBranchScopeCommitShareSeries>;
  coverageShareSeries: ReturnType<typeof buildCoverageShareSeries>;
  branchCount: number;
  defaultBranchName: string;
  commitsByBranch: Record<string, number>;
}) {
  const branchRows = useMemo(
    () =>
      Object.entries(commitsByBranch)
        .map(([branch, commits]) => ({
          branch,
          commits: Number(commits ?? 0),
        }))
        .filter((row) => row.branch)
        .sort((a, b) => {
          if (a.branch === defaultBranchName) return -1;
          if (b.branch === defaultBranchName) return 1;
          return b.commits - a.commits;
        }),
    [commitsByBranch, defaultBranchName]
  );

  const [selectedBranch, setSelectedBranch] = useState<string>("");

  useEffect(() => {
    if (branchRows.length <= 0) {
      setSelectedBranch("");
      return;
    }

    const preferred =
      branchRows.find((row) => row.branch === defaultBranchName)?.branch || branchRows[0].branch;
    setSelectedBranch((current) =>
      current && branchRows.some((row) => row.branch === current) ? current : preferred
    );
  }, [branchRows, defaultBranchName]);

  const totalBranchCommits = branchRows.reduce((sum, row) => sum + row.commits, 0);
  const selectedBranchCommits =
    branchRows.find((row) => row.branch === selectedBranch)?.commits ?? 0;
  const branchDistributionMinWidth = getChartMinWidth(branchRows.length, { base: 560, pointWidth: 78 });
  const branchTickInterval = getDateTickInterval(branchRows.length, { maxTicks: 14 });

  return (
    <>
      <div className="github-chart-section__metrics">
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Default branch</p>
          <p className="github-chart-section__metric-value">{defaultBranchName}</p>
        </article>
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Tracked branches</p>
          <p className="github-chart-section__metric-value">{formatNumber(branchCount)}</p>
        </article>
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Selected branch commits</p>
          <p className="github-chart-section__metric-value">{formatNumber(selectedBranchCommits)}</p>
        </article>
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">All branch commits</p>
          <p className="github-chart-section__metric-value">{formatNumber(totalBranchCommits)}</p>
        </article>
      </div>

      <div className="github-chart-section__grid">
        {branchRows.length > 0 ? (
          <GithubChartCard
            title="Branch commit distribution"
            info={chartInfo.branchDistribution}
            size="full"
            minChartWidth={branchDistributionMinWidth}
          >
            <div className="github-chart-section__canvas github-chart-section__canvas--md">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchRows} margin={{ top: 10, right: 18, left: 12, bottom: 4 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="branch"
                    interval={branchTickInterval}
                    tickMargin={14}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    minTickGap={18}
                    label={{ value: "Branch", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                    label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="commits"
                    name="Commits"
                    fill={CHART_COLOR_COMMITS}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    animationDuration={420}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GithubChartCard>
        ) : null}

        {branchScopeCommitShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Default vs other branches"
            data={branchScopeCommitShareSeries}
            info={chartInfo.branchScope}
            className="github-chart-section__panel github-chart-section__panel--half"
          />
        ) : null}

        {coverageShareSeries.length > 0 ? (
          <GithubDonutChartCard
            title="Matched vs unmatched commits"
            data={coverageShareSeries}
            info={chartInfo.mappingCoverage}
            className="github-chart-section__panel github-chart-section__panel--half"
          />
        ) : null}
      </div>

      {branchRows.length > 0 ? (
        <div className="github-chart-section__branch-commits">
          <div className="github-chart-section__branch-controls">
            <label className="github-chart-section__branch-label" htmlFor="branch-activity-select">
              Branch selector
            </label>
            <select
              id="branch-activity-select"
              className="github-chart-section__branch-select"
              value={selectedBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
            >
              {branchRows.map((row) => (
                <option key={row.branch} value={row.branch}>
                  {row.branch}
                  {row.branch === defaultBranchName ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="github-chart-section__branch-list">
            {branchRows.map((row) => (
              <div
                key={row.branch}
                className={`github-chart-section__branch-row${row.branch === selectedBranch ? " is-selected" : ""}`}
              >
                <div>
                  <p className="github-chart-section__branch-name">
                    {row.branch}
                    {row.branch === defaultBranchName ? " (default)" : ""}
                  </p>
                  <p className="github-chart-section__branch-subtext">
                    {formatPercent(row.commits, Math.max(1, totalBranchCommits))} of branch commits
                  </p>
                </div>
                <p className="github-chart-section__branch-commit-value">{formatNumber(row.commits)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted">No branch commit breakdown available in this snapshot.</p>
      )}
    </>
  );
}

function PersonalActivity({
  commitTimelineSeries,
  personalWeeklySeries,
  personalShares,
}: {
  commitTimelineSeries: ReturnType<typeof buildCommitTimelineSeries>;
  personalWeeklySeries: ReturnType<typeof buildWeeklyCommitSeries>;
  personalShares: ReturnType<typeof buildPersonalShareSeries>;
}) {
  const personalTimeline = commitTimelineSeries.map((row) => ({
    date: row.date,
    commits: Number(row.personalCommits ?? 0),
  }));

  const timelineMinWidth = getChartMinWidth(personalTimeline.length, { base: 640, pointWidth: 42 });
  const weeklyMinWidth = getChartMinWidth(personalWeeklySeries.length, { base: 560, pointWidth: 68 });
  const personalTimelineTickInterval = getDateTickInterval(personalTimeline.length, { maxTicks: 10 });
  const personalWeeklyTickInterval = getDateTickInterval(personalWeeklySeries.length, { maxTicks: 10 });

  return (
    <GithubSectionContainer
      kicker="My code activity"
      title="Personal contribution analytics"
      description="Your contribution share and commit rhythm based on the latest repository snapshot."
    >
      <div className="github-chart-section__metrics">
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Your commits</p>
          <p className="github-chart-section__metric-value">{formatNumber(personalShares.personalCommits)}</p>
        </article>
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Your line changes</p>
          <p className="github-chart-section__metric-value">{formatNumber(personalShares.personalLineChanges)}</p>
        </article>
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Commit share</p>
          <p className="github-chart-section__metric-value">
            {personalShares.totalCommits > 0
              ? `${((personalShares.personalCommits / personalShares.totalCommits) * 100).toFixed(1)}%`
              : "0%"}
          </p>
        </article>
        <article className="github-chart-section__metric">
          <p className="github-chart-section__metric-label">Line share</p>
          <p className="github-chart-section__metric-value">
            {personalShares.totalLineChanges > 0
              ? `${((personalShares.personalLineChanges / personalShares.totalLineChanges) * 100).toFixed(1)}%`
              : "0%"}
          </p>
        </article>
      </div>

      <div className="github-chart-section__grid">
        {personalShares.commitShare.length > 0 ? (
          <GithubDonutChartCard
            title="You vs team (commits)"
            data={personalShares.commitShare}
            info={chartInfo.personalCommitShare}
            className="github-chart-section__panel github-chart-section__panel--half"
          />
        ) : null}

        {personalShares.lineShare.length > 0 ? (
          <GithubDonutChartCard
            title="You vs team (line changes)"
            data={personalShares.lineShare}
            info={chartInfo.personalLineShare}
            className="github-chart-section__panel github-chart-section__panel--half"
          />
        ) : null}

        {personalTimeline.length > 0 ? (
          <GithubChartCard
            title="My commits over time"
            info={chartInfo.personalCommitsTimeline}
            size="full"
            minChartWidth={timelineMinWidth}
          >
            <div className="github-chart-section__canvas github-chart-section__canvas--xl">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={personalTimeline}
                  margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    interval={personalTimelineTickInterval}
                    tickMargin={14}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={formatShortDate}
                    minTickGap={18}
                    label={{ value: "Date", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                    label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                  />
                  <Tooltip labelFormatter={(label) => formatShortDate(String(label))} contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="commits"
                    name="Commits"
                    stroke={CHART_COLOR_COMMITS}
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 4 }}
                    animationDuration={420}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GithubChartCard>
        ) : null}

        {personalWeeklySeries.length > 0 ? (
          <GithubChartCard
            title="My weekly commit totals"
            info={chartInfo.personalWeeklyCommits}
            size="full"
            minChartWidth={weeklyMinWidth}
          >
            <div className="github-chart-section__canvas github-chart-section__canvas--md">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={personalWeeklySeries}
                  margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                  barCategoryGap="16%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="weekLabel"
                    interval={personalWeeklyTickInterval}
                    tickMargin={14}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={(value) => String(value).replace(/^(\d{4})-W/, "W")}
                    minTickGap={20}
                    label={{ value: "Week", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                    label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                  />
                  <Tooltip
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { weekKey?: string; rangeStart?: string; rangeEnd?: string }
                        | undefined;
                      return row?.rangeStart && row?.rangeEnd
                        ? `Week ${row.weekKey ?? ""}: ${formatDateRange(row.rangeStart, row.rangeEnd)}`
                        : "Week";
                    }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="commits"
                    name="Commits"
                    fill={CHART_COLOR_COMMITS}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={34}
                    animationDuration={420}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GithubChartCard>
        ) : null}
      </div>
    </GithubSectionContainer>
  );
}

export function GithubRepoChartsDashboard({
  snapshot,
  coverage,
  currentGithubLogin,
  viewerMode = "student",
  viewMode,
  repositoryFullName,
}: GithubRepoChartsDashboardProps) {
  const [activeActivityTab, setActiveActivityTab] = useState<TeamActivityTab>("teamCharts");
  const resolvedMode: ChartViewMode = viewMode || (viewerMode === "staff" ? "staff" : "team");

  const showPersonalCommitSeries = resolvedMode !== "staff";
  const commitTimelineSeries = buildCommitTimelineSeries(snapshot, currentGithubLogin, {
    includePersonal: showPersonalCommitSeries,
  });
  const lineChangesByDaySeries = buildLineChangesByDaySeries(snapshot);
  const weeklyCommitSeries = buildWeeklyCommitSeries(
    commitTimelineSeries.map((row) => ({ date: row.date, commits: row.commits }))
  );
  const branchScopeCommitShareSeries = buildBranchScopeCommitShareSeries(snapshot);
  const coverageShareSeries = buildCoverageShareSeries(coverage);
  const contributors = buildContributorRows(snapshot);
  const lineChangeDomain = getLineChangeDomain(lineChangesByDaySeries);
  const personalShares = buildPersonalShareSeries({ snapshot, currentGithubLogin });
  const personalWeeklySeries = buildWeeklyCommitSeries(
    commitTimelineSeries
      .map((row) => ({ date: row.date, commits: Number(row.personalCommits ?? 0) }))
      .filter((row) => row.commits > 0)
  );

  const totalContributors = Number(snapshot?.repoStats?.[0]?.totalContributors ?? 0);
  const totalCommits = Number(snapshot?.repoStats?.[0]?.totalCommits ?? 0);
  const totalAdditions = Number(snapshot?.repoStats?.[0]?.totalAdditions ?? 0);
  const totalDeletions = Number(snapshot?.repoStats?.[0]?.totalDeletions ?? 0);
  const branchCount = Number(snapshot?.data?.branchScopeStats?.allBranches?.branchCount ?? 0);
  const defaultBranchName = snapshot?.data?.branchScopeStats?.defaultBranch?.branch || "main";

  const hasData =
    commitTimelineSeries.length > 0 ||
    lineChangesByDaySeries.length > 0 ||
    weeklyCommitSeries.length > 0 ||
    contributors.length > 0 ||
    personalShares.commitShare.length > 0 ||
    personalShares.lineShare.length > 0;

  if (!hasData) {
    return (
      <section className="github-chart-section" aria-label="Repository charts">
        <EmptyState />
      </section>
    );
  }

  if (resolvedMode === "personal") {
    return (
      <section className="github-chart-section" aria-label="My code activity charts">
        <PersonalActivity
          commitTimelineSeries={commitTimelineSeries}
          personalWeeklySeries={personalWeeklySeries}
          personalShares={personalShares}
        />
      </section>
    );
  }

  const sectionLabels =
    resolvedMode === "staff"
      ? {
          analyticsKicker: "Team Overview",
          analyticsTitle: "Team code activity",
          analyticsDescription:
            "Inspect repository activity with focused sections for charts, contributors, and branch-level signals.",
        }
      : {
          analyticsKicker: "Repository Analytics",
          analyticsTitle: "Team code activity",
          analyticsDescription:
            "Team-level trends across commits and line changes with consistent date-based charts.",
        };

  const activityTabs: Array<{ key: TeamActivityTab; label: string }> = [
    { key: "teamCharts", label: "Team charts" },
    { key: "contributors", label: "Contributors" },
    { key: "branchActivity", label: "Branch activity" },
  ];

  return (
    <section className="github-chart-section" aria-label="Repository charts">
      <GithubSectionContainer
        kicker={sectionLabels.analyticsKicker}
        title={sectionLabels.analyticsTitle}
        description={sectionLabels.analyticsDescription}
      >
        <div className="github-chart-section__metrics">
          <article className="github-chart-section__metric">
            <p className="github-chart-section__metric-label">Total commits</p>
            <p className="github-chart-section__metric-value">{formatNumber(totalCommits)}</p>
          </article>
          <article className="github-chart-section__metric">
            <p className="github-chart-section__metric-label">Contributors</p>
            <p className="github-chart-section__metric-value">{formatNumber(totalContributors)}</p>
          </article>
          <article className="github-chart-section__metric">
            <p className="github-chart-section__metric-label">Additions</p>
            <p className="github-chart-section__metric-value">{formatNumber(totalAdditions)}</p>
          </article>
          <article className="github-chart-section__metric">
            <p className="github-chart-section__metric-label">Deletions</p>
            <p className="github-chart-section__metric-value">{formatNumber(totalDeletions)}</p>
          </article>
        </div>

        <nav className="github-chart-section__subnav" role="tablist" aria-label="Team code activity sections">
          {activityTabs.map((tab) => {
            const isActive = activeActivityTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`activity-tab-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`activity-panel-${tab.key}`}
                className={`github-chart-section__subnav-btn${isActive ? " is-active" : ""}`}
                onClick={() => setActiveActivityTab(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div
          id={`activity-panel-${activeActivityTab}`}
          role="tabpanel"
          aria-labelledby={`activity-tab-${activeActivityTab}`}
          className="github-chart-section__tab-panel"
        >
          {activeActivityTab === "teamCharts" ? (
            <div className="github-chart-section__tab-content">
              <div className="github-chart-section__tab-header">
                <h4 className="github-chart-section__tab-title">Team charts</h4>
                <p className="muted github-chart-section__tab-description">
                  Commit and line-change trends across the linked repository.
                </p>
              </div>
              <RepositoryAnalyticsCharts
                commitTimelineSeries={commitTimelineSeries}
                lineChangesByDaySeries={lineChangesByDaySeries}
                weeklyCommitSeries={weeklyCommitSeries}
                lineChangeDomain={lineChangeDomain}
                showPersonalCommitSeries={showPersonalCommitSeries}
              />
            </div>
          ) : null}

          {activeActivityTab === "contributors" ? (
            <div className="github-chart-section__tab-content">
              <div className="github-chart-section__tab-header">
                <h4 className="github-chart-section__tab-title">Contributor breakdown</h4>
                <p className="muted github-chart-section__tab-description">
                  Ranked contributor cards with commits, line deltas, and mini activity charts.
                </p>
              </div>
              <ContributorBreakdown
                contributors={contributors}
                repositoryFullName={repositoryFullName}
              />
            </div>
          ) : null}

          {activeActivityTab === "branchActivity" ? (
            <div className="github-chart-section__tab-content">
              <div className="github-chart-section__tab-header">
                <h4 className="github-chart-section__tab-title">Branch activity</h4>
                <p className="muted github-chart-section__tab-description">
                  Default-branch share, branch coverage, and commit mapping confidence.
                </p>
              </div>
              <BranchActivity
                branchScopeCommitShareSeries={branchScopeCommitShareSeries}
                coverageShareSeries={coverageShareSeries}
                branchCount={branchCount}
                defaultBranchName={defaultBranchName}
              />
            </div>
          ) : null}
        </div>
      </GithubSectionContainer>
    </section>
  );
}
