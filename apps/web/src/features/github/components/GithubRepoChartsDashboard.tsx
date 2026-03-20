"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  buildTopContributorBarSeries,
  buildWeeklyCommitSeries,
  CHART_COLOR_ADDITIONS,
  CHART_COLOR_COMMITS,
  CHART_COLOR_DELETIONS,
  formatDateRange,
  formatNumber,
  formatShortDate,
  getChartMinWidth,
  getContributorAxisWidth,
  getLineChangeDomain,
} from "./GithubRepoChartsDashboard.helpers";
import { GithubSectionContainer } from "./GithubSectionContainer";
import type { GithubLatestSnapshot, GithubMappingCoverage } from "../types";

type ChartViewMode = "team" | "personal" | "staff";

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
  const commitsChartMinWidth = getChartMinWidth(commitTimelineSeries.length, { base: 820, pointWidth: 60 });
  const linesChartMinWidth = getChartMinWidth(lineChangesByDaySeries.length, { base: 820, pointWidth: 62 });
  const weeklyChartMinWidth = getChartMinWidth(weeklyCommitSeries.length, { base: 620, pointWidth: 80 });

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
              <BarChart
                data={commitTimelineSeries}
                margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                barCategoryGap="22%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  interval={0}
                  tickMargin={14}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={formatShortDate}
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
                <Bar
                  dataKey="commits"
                  name="Team commits"
                  fill={CHART_COLOR_COMMITS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                  animationDuration={420}
                />
                {showPersonalCommitSeries ? (
                  <Bar
                    dataKey="personalCommits"
                    name="Your commits"
                    fill={CHART_COLOR_ADDITIONS}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    animationDuration={420}
                  />
                ) : null}
              </BarChart>
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
                barCategoryGap="24%"
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  interval={0}
                  tickMargin={14}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={formatShortDate}
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
                  stackId="line-change-stack"
                  dataKey="additions"
                  name="Additions"
                  fill={CHART_COLOR_ADDITIONS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  animationDuration={420}
                />
                <Bar
                  stackId="line-change-stack"
                  dataKey="deletions"
                  name="Deletions"
                  fill={CHART_COLOR_DELETIONS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
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
                barCategoryGap="26%"
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="weekLabel"
                  interval={0}
                  tickMargin={14}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={(value) => String(value).replace(/^(\d{4})-W/, "W")}
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
  topContributorsBarSeries,
}: {
  contributors: ReturnType<typeof buildContributorRows>;
  repositoryFullName?: string | null;
  topContributorsBarSeries: ReturnType<typeof buildTopContributorBarSeries>;
}) {
  const axisWidth = getContributorAxisWidth(contributors);
  const chartHeight = Math.max(320, topContributorsBarSeries.length * 36);

  return (
    <>
      <div className="github-chart-section__grid">
        {topContributorsBarSeries.length > 0 ? (
          <GithubChartCard title="Top contributors by commits" info={chartInfo.topContributors} size="full">
            <div className="github-chart-section__canvas" style={{ height: `${chartHeight}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topContributorsBarSeries}
                  layout="vertical"
                  margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                    label={{ value: "Commits", position: "insideBottomRight", offset: -2, fill: "var(--muted)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="contributor"
                    width={axisWidth}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    interval={0}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="commits"
                    name="Commits"
                    fill={CHART_COLOR_COMMITS}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={26}
                    animationDuration={420}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GithubChartCard>
        ) : null}
      </div>

      {contributors.length > 0 ? (
        <div className="github-chart-section__contributor-grid" role="list">
          {contributors.map((contributor) => (
            <GithubContributorCard
              key={contributor.key}
              contributor={contributor}
              repositoryFullName={repositoryFullName}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </>
  );
}

function BranchActivity({
  branchScopeCommitShareSeries,
  coverageShareSeries,
  branchCount,
  defaultBranchName,
}: {
  branchScopeCommitShareSeries: ReturnType<typeof buildBranchScopeCommitShareSeries>;
  coverageShareSeries: ReturnType<typeof buildCoverageShareSeries>;
  branchCount: number;
  defaultBranchName: string;
}) {
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
      </div>

      <div className="github-chart-section__grid">
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

  const timelineMinWidth = getChartMinWidth(personalTimeline.length, { base: 760, pointWidth: 58 });
  const weeklyMinWidth = getChartMinWidth(personalWeeklySeries.length, { base: 620, pointWidth: 80 });

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
                <BarChart
                  data={personalTimeline}
                  margin={{ top: 10, right: 18, left: 12, bottom: 4 }}
                  barCategoryGap="26%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    interval={0}
                    tickMargin={14}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={formatShortDate}
                    label={{ value: "Date", position: "insideBottom", offset: -2, fill: "var(--muted)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                    label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                  />
                  <Tooltip labelFormatter={(label) => formatShortDate(String(label))} contentStyle={tooltipStyle} />
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
                  barCategoryGap="26%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="weekLabel"
                    interval={0}
                    tickMargin={14}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={(value) => String(value).replace(/^(\d{4})-W/, "W")}
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
  const topContributorsBarSeries = buildTopContributorBarSeries(contributors);
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
          analyticsTitle: "Repository analytics",
          analyticsDescription:
            "A clean view of commit trends and line-change activity for staff review.",
          contributorsKicker: "Contributor Breakdown",
          contributorsTitle: "Commit and line-change leaders",
          branchKicker: "Repository Activity",
          branchTitle: "Branch scope and mapping confidence",
        }
      : {
          analyticsKicker: "Repository Analytics",
          analyticsTitle: "Team code activity",
          analyticsDescription:
            "Team-level trends across commits and line changes with consistent date-based charts.",
          contributorsKicker: "Contributor Breakdown",
          contributorsTitle: "Contributor cards and rankings",
          branchKicker: "Branch Activity",
          branchTitle: "Default vs branch activity",
        };

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

        <RepositoryAnalyticsCharts
          commitTimelineSeries={commitTimelineSeries}
          lineChangesByDaySeries={lineChangesByDaySeries}
          weeklyCommitSeries={weeklyCommitSeries}
          lineChangeDomain={lineChangeDomain}
          showPersonalCommitSeries={showPersonalCommitSeries}
        />
      </GithubSectionContainer>

      <GithubSectionContainer
        kicker={sectionLabels.contributorsKicker}
        title={sectionLabels.contributorsTitle}
      >
        <ContributorBreakdown
          contributors={contributors}
          repositoryFullName={repositoryFullName}
          topContributorsBarSeries={topContributorsBarSeries}
        />
      </GithubSectionContainer>

      <GithubSectionContainer kicker={sectionLabels.branchKicker} title={sectionLabels.branchTitle}>
        <BranchActivity
          branchScopeCommitShareSeries={branchScopeCommitShareSeries}
          coverageShareSeries={coverageShareSeries}
          branchCount={branchCount}
          defaultBranchName={defaultBranchName}
        />
      </GithubSectionContainer>
    </section>
  );
}
