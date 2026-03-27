"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { SkeletonText } from "@/shared/ui/Skeleton";
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
import type { GithubChartInfoContent } from "./GithubChartInfo";
import { GithubContributorCard } from "./GithubContributorCard";
import { githubRepoChartInfo as chartInfo } from "./GithubRepoChartsDashboard.info";
import {
  buildCommitTimelineSeries,
  buildContributorRows,
  buildLineChangesByDaySeries,
  buildPersonalShareSeries,
  buildWeeklyCommitSeries,
  CHART_COLOR_ADDITIONS,
  CHART_COLOR_COMMITS,
  CHART_COLOR_DELETIONS,
  formatDateRange,
  formatNumber,
  formatShortDate,
  getDateTickInterval,
  getChartMinWidth,
  getContributorWeeklyActivity,
  getLineChangeDomain,
  getSnapshotRepoTotals,
} from "./GithubRepoChartsDashboard.helpers";
import { GithubSectionContainer } from "./GithubSectionContainer";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubMappingCoverage,
} from "../types";

type ChartViewMode = "team" | "personal" | "staff";
type TeamActivityTab = "teamCharts" | "contributors" | "branchActivity";

type GithubRepoChartsDashboardProps = {
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  coverage: GithubMappingCoverage | null;
  currentGithubLogin: string | null;
  viewerMode?: "student" | "staff";
  viewMode?: ChartViewMode;
  repositoryFullName?: string | null;
  liveBranches?: GithubLiveProjectRepoBranches | null;
  liveBranchesLoading?: boolean;
  liveBranchesError?: string | null;
  liveBranchesRefreshing?: boolean;
  selectedBranch?: string;
  onSelectBranch?: (branchName: string) => void;
  branchCommits?: GithubLiveProjectRepoBranchCommits | null;
  branchCommitsLoading?: boolean;
  branchCommitsError?: string | null;
  onRefreshBranches?: () => void;
};

function EmptyState() {
  return <p className="muted">No chart data available for this snapshot yet.</p>;
}

function formatCommitDateTime(value: string | null) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function resolveCommitAxisMax(dataMax: number) {
  const numeric = Number(dataMax);
  if (!Number.isFinite(numeric) || numeric <= 0) return 4;
  return Math.max(4, Math.ceil(numeric * 1.12));
}

function WeeklyCommitTotalsChart({
  title,
  info,
  data,
  minChartWidth,
  tickInterval,
  size = "half",
}: {
  title: string;
  info: GithubChartInfoContent;
  data: Array<{ weekKey: string; weekLabel: string; rangeStart: string; rangeEnd: string; commits: number }>;
  minChartWidth: number;
  tickInterval: number;
  size?: "half" | "full";
}) {
  return (
    <GithubChartCard title={title} info={info} size={size} minChartWidth={minChartWidth}>
      <div className="github-chart-section__canvas github-chart-section__canvas--weekly">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
            barCategoryGap="12%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="weekLabel"
              interval={tickInterval}
              tickMargin={12}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              minTickGap={14}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, resolveCommitAxisMax]}
              tick={{ fill: "var(--muted)" }}
              width={42}
              axisLine={false}
              tickLine={false}
              label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
            />
            <Tooltip
              isAnimationActive
              content={<ChartTooltipContent />}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { weekKey?: string; rangeStart?: string; rangeEnd?: string }
                  | undefined;
                return row?.rangeStart && row?.rangeEnd
                  ? `Week ${row.weekKey ?? ""}: ${formatDateRange(row.rangeStart, row.rangeEnd)}`
                  : "Week";
              }}
              formatter={(value) => [formatNumber(Number(value ?? 0)), "Commits"]}
            />
            <Bar
              dataKey="commits"
              name="Commits"
              fill={CHART_COLOR_COMMITS}
              radius={[6, 6, 0, 0]}
              minPointSize={2}
              animationDuration={420}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GithubChartCard>
  );
}

function LineChangesTimelineChart({
  title,
  data,
  lineChangeDomain,
  minChartWidth,
  tickInterval,
  size = "full",
}: {
  title: string;
  data: Array<{ date: string; additions: number; deletions: number }>;
  lineChangeDomain: readonly [number, number] | undefined;
  minChartWidth: number;
  tickInterval: number;
  size?: "half" | "full";
}) {
  return (
    <GithubChartCard
      title={title}
      info={chartInfo.lineChanges}
      size={size}
      minChartWidth={minChartWidth}
    >
      <div className="github-chart-section__canvas github-chart-section__canvas--xl">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
            barCategoryGap="24%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              interval={tickInterval}
              tickMargin={12}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={formatShortDate}
              minTickGap={18}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={lineChangeDomain}
              tick={{ fill: "var(--muted)" }}
              width={54}
              axisLine={false}
              tickLine={false}
              label={{ value: "Lines changed", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
            />
            <Tooltip
              isAnimationActive
              content={<ChartTooltipContent />}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name) => [Math.abs(Number(value ?? 0)).toLocaleString(), name]}
            />
            <Legend align="right" verticalAlign="top" iconType="circle" iconSize={8} />
            <Bar
              dataKey="additions"
              name="Additions"
              fill={CHART_COLOR_ADDITIONS}
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              animationDuration={420}
              isAnimationActive
            />
            <Bar
              dataKey="deletions"
              name="Deletions"
              fill={CHART_COLOR_DELETIONS}
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              animationDuration={420}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GithubChartCard>
  );
}

function RepositoryAnalyticsCharts({
  commitTimelineSeries,
  lineChangesByDaySeries,
  weeklyCommitSeries,
  lineChangeDomain,
}: {
  commitTimelineSeries: Array<{ date: string; commits: number; personalCommits?: number }>;
  lineChangesByDaySeries: Array<{ date: string; additions: number; deletions: number }>;
  weeklyCommitSeries: Array<{ weekKey: string; weekLabel: string; rangeStart: string; rangeEnd: string; commits: number }>;
  lineChangeDomain: readonly [number, number] | undefined;
}) {
  const commitsChartMinWidth = getChartMinWidth(commitTimelineSeries.length, {
    base: 640,
    pointWidth: 28,
    max: 1500,
  });
  const linesChartMinWidth = getChartMinWidth(lineChangesByDaySeries.length, {
    base: 640,
    pointWidth: 24,
    max: 1500,
  });
  const weeklyChartMinWidth = getChartMinWidth(weeklyCommitSeries.length, { base: 520, pointWidth: 60, max: 980 });
  const commitTickInterval = getDateTickInterval(commitTimelineSeries.length, { maxTicks: 9 });
  const lineChangeTickInterval = getDateTickInterval(lineChangesByDaySeries.length, { maxTicks: 9 });
  const weeklyTickInterval = getDateTickInterval(weeklyCommitSeries.length, { maxTicks: 12 });

  return (
    <div className="github-chart-section__grid">
      {commitTimelineSeries.length > 0 ? (
        <GithubChartCard
          title="Commits over time"
          info={chartInfo.commitsTimeline}
          size="full"
          minChartWidth={commitsChartMinWidth}
        >
          <div className="github-chart-section__canvas github-chart-section__canvas--xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={commitTimelineSeries}
                margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
                barCategoryGap="26%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  interval={commitTickInterval}
                  tickMargin={12}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={formatShortDate}
                  minTickGap={18}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)" }}
                  width={42}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                />
                <Tooltip
                  isAnimationActive
                  content={<ChartTooltipContent />}
                  labelFormatter={(label) => formatShortDate(String(label))}
                  formatter={(value, name) => [formatNumber(Number(value ?? 0)), name]}
                />
                <Legend align="right" verticalAlign="top" iconType="circle" iconSize={8} />
                <Bar
                  dataKey="commits"
                  name="Team commits"
                  fill={CHART_COLOR_COMMITS}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={12}
                  animationDuration={300}
                  isAnimationActive
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GithubChartCard>
      ) : null}

      {lineChangesByDaySeries.length > 0 ? (
        <LineChangesTimelineChart
          title="Additions and deletions over time"
          data={lineChangesByDaySeries}
          lineChangeDomain={lineChangeDomain}
          minChartWidth={linesChartMinWidth}
          tickInterval={lineChangeTickInterval}
          size="full"
        />
      ) : null}

      {weeklyCommitSeries.length > 0 ? (
        <WeeklyCommitTotalsChart
          title="Weekly commit totals"
          info={chartInfo.weeklyCommits}
          data={weeklyCommitSeries}
          minChartWidth={weeklyChartMinWidth}
          tickInterval={weeklyTickInterval}
          size="half"
        />
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
  const weeklyDenominator = contributors.reduce((max, contributor) => {
    const activity = getContributorWeeklyActivity(contributor.commitsByDay);
    return Math.max(max, activity.activeWeeks);
  }, 0);

  return (
    <div className="github-chart-section__contributor-grid" role="list">
      {contributors.map((contributor) => (
        <GithubContributorCard
          key={contributor.key}
          contributor={contributor}
          repositoryFullName={repositoryFullName}
          showWeeklyCommitSummary
          weeklyDenominator={weeklyDenominator}
        />
      ))}
    </div>
  );
}

function BranchActivity({
  totalBranchCommits,
  branchCount,
  defaultBranchName,
  commitsByBranch,
  liveBranches,
  liveBranchesLoading,
  liveBranchesError,
  liveBranchesRefreshing,
  selectedBranch,
  onSelectBranch,
  branchCommits,
  branchCommitsLoading,
  branchCommitsError,
  onRefreshBranches,
}: {
  totalBranchCommits: number;
  branchCount: number;
  defaultBranchName: string;
  commitsByBranch: Record<string, number>;
  liveBranches: GithubLiveProjectRepoBranches | null;
  liveBranchesLoading: boolean;
  liveBranchesError: string | null;
  liveBranchesRefreshing: boolean;
  selectedBranch: string;
  onSelectBranch?: (branchName: string) => void;
  branchCommits: GithubLiveProjectRepoBranchCommits | null;
  branchCommitsLoading: boolean;
  branchCommitsError: string | null;
  onRefreshBranches?: () => void;
}) {
  const selectedBranchCommitCount =
    typeof commitsByBranch[selectedBranch] === "number" ? Number(commitsByBranch[selectedBranch]) : null;
  const branchRows = liveBranches?.branches ?? [];
  const recentCommits = branchCommits?.commits ?? [];

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
          <p className="github-chart-section__metric-label">All branch commits</p>
          <p className="github-chart-section__metric-value">{formatNumber(totalBranchCommits)}</p>
        </article>
      </div>

      <div className="github-chart-section__panel github-chart-section__panel--full">
        <div className="github-repos-tab__header">
          <div className="github-repos-tab__title">
            <p className="github-repos-tab__kicker">Repository activity</p>
            <h3 className="github-repos-tab__heading">Branch commits</h3>
          </div>
          {onRefreshBranches ? (
            <Button
              variant="ghost"
              onClick={() => onRefreshBranches()}
              disabled={liveBranchesLoading || liveBranchesRefreshing}
            >
              {liveBranchesLoading || liveBranchesRefreshing ? "Refreshing branches..." : "Refresh branches"}
            </Button>
          ) : null}
        </div>

        <p className="muted github-repos-tab__helper">
          Select a branch to inspect recent commits. The selector defaults to <strong>main</strong> when available.
        </p>

        {liveBranchesError ? (
          <p className="muted github-repos-tab__table-wrap">
            Failed to load branches: {liveBranchesError}
          </p>
        ) : null}

        {branchRows.length > 0 ? (
          <div className="stack github-repos-tab__select-wrap">
            <label className="muted" htmlFor="branch-activity-select">
              Select branch
            </label>
            <select
              id="branch-activity-select"
              className="github-repos-tab__select"
              value={selectedBranch}
              onChange={(event) => onSelectBranch?.(event.target.value)}
              disabled={liveBranchesLoading}
            >
              {branchRows.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                  {branch.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            {selectedBranchCommitCount != null ? (
              <p className="muted">
                {formatNumber(selectedBranchCommitCount)} snapshot commits
              </p>
            ) : null}
          </div>
        ) : liveBranchesLoading ? (
          <div className="github-repos-tab__table-wrap" role="status" aria-live="polite">
            <SkeletonText lines={1} widths={["26%"]} />
            <span className="ui-visually-hidden">Loading branches...</span>
          </div>
        ) : (
          <p className="muted github-repos-tab__table-wrap">No branches returned for this repository.</p>
        )}

        {branchCommitsLoading ? (
          <div className="github-repos-tab__table-wrap" role="status" aria-live="polite">
            <SkeletonText lines={1} widths={["38%"]} />
            <span className="ui-visually-hidden">Loading recent commits...</span>
          </div>
        ) : null}
        {branchCommitsError ? (
          <p className="muted github-repos-tab__table-wrap">
            Failed to load commits: {branchCommitsError}
          </p>
        ) : null}
        {!branchCommitsLoading && !branchCommitsError && selectedBranch && recentCommits.length === 0 ? (
          <p className="muted github-repos-tab__table-wrap">No commits returned for this branch.</p>
        ) : null}

        {recentCommits.length > 0 ? (
          <div className="github-repos-tab__table-wrap stack" style={{ gap: 10 }}>
            {recentCommits.map((commit) => (
              <div key={commit.sha} className="stack github-repos-tab__commit-cell">
                <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="github-repos-tab__commit-link">
                  {commit.message || "(no message)"}
                </a>
                <div className="github-repos-tab__commit-meta-row">
                  <span className="muted github-repos-tab__commit-meta">
                    {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                  </span>
                  <span className="muted github-repos-tab__commit-meta">{formatCommitDateTime(commit.date)}</span>
                  {typeof commit.additions === "number" || typeof commit.deletions === "number" ? (
                    <span className="muted github-repos-tab__commit-meta">
                      +{commit.additions ?? 0} / -{commit.deletions ?? 0}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
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

  const timelineMinWidth = getChartMinWidth(personalTimeline.length, { base: 620, pointWidth: 28, max: 1500 });
  const weeklyMinWidth = getChartMinWidth(personalWeeklySeries.length, { base: 520, pointWidth: 60, max: 980 });
  const personalTimelineTickInterval = getDateTickInterval(personalTimeline.length, { maxTicks: 9 });
  const personalWeeklyTickInterval = getDateTickInterval(personalWeeklySeries.length, { maxTicks: 12 });

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
                  margin={{ top: 8, right: 8, left: 6, bottom: 6 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    interval={personalTimelineTickInterval}
                    tickMargin={12}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={formatShortDate}
                    minTickGap={18}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                    width={42}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Commits", angle: -90, position: "insideLeft", fill: "var(--muted)" }}
                  />
                  <Tooltip
                    isAnimationActive
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => formatShortDate(String(label))}
                    formatter={(value) => [formatNumber(Number(value ?? 0)), "Commits"]}
                  />
                  <Bar
                    dataKey="commits"
                    name="Commits"
                    fill={CHART_COLOR_COMMITS}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={14}
                    animationDuration={300}
                    isAnimationActive
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GithubChartCard>
        ) : null}

        {personalWeeklySeries.length > 0 ? (
          <WeeklyCommitTotalsChart
            title="My weekly commit totals"
            info={chartInfo.personalWeeklyCommits}
            data={personalWeeklySeries}
            minChartWidth={weeklyMinWidth}
            tickInterval={personalWeeklyTickInterval}
            size="full"
          />
        ) : null}
      </div>
    </GithubSectionContainer>
  );
}

export function GithubRepoChartsDashboard({
  snapshot,
  currentGithubLogin,
  viewMode,
  repositoryFullName,
  liveBranches = null,
  liveBranchesLoading = false,
  liveBranchesError = null,
  liveBranchesRefreshing = false,
  selectedBranch = "",
  onSelectBranch,
  branchCommits = null,
  branchCommitsLoading = false,
  branchCommitsError = null,
  onRefreshBranches,
}: GithubRepoChartsDashboardProps) {
  const [activeActivityTab, setActiveActivityTab] = useState<TeamActivityTab>("teamCharts");
  const resolvedMode: "team" | "personal" = viewMode === "personal" ? "personal" : "team";

  const commitTimelineSeries = buildCommitTimelineSeries(snapshot, currentGithubLogin, {
    includePersonal: resolvedMode === "personal",
  });
  const lineChangesByDaySeries = buildLineChangesByDaySeries(snapshot);
  const weeklyCommitSeries = buildWeeklyCommitSeries(
    commitTimelineSeries.map((row) => ({ date: row.date, commits: row.commits }))
  );
  const contributors = buildContributorRows(snapshot);
  const lineChangeDomain = getLineChangeDomain(lineChangesByDaySeries);
  const personalShares = buildPersonalShareSeries({ snapshot, currentGithubLogin });
  const personalWeeklySeries = buildWeeklyCommitSeries(
    commitTimelineSeries.map((row) => ({ date: row.date, commits: Number(row.personalCommits ?? 0) }))
  );

  const totals = getSnapshotRepoTotals(snapshot);
  const totalContributors = totals.totalContributors;
  const totalCommits = Number(
    snapshot?.repoStats?.[0]?.defaultBranchCommits ??
      snapshot?.data?.branchScopeStats?.defaultBranch?.totalCommits ??
      totals.totalCommits
  );
  const totalAdditions = totals.totalAdditions;
  const totalDeletions = totals.totalDeletions;
  const branchCount = Number(snapshot?.data?.branchScopeStats?.allBranches?.branchCount ?? 0);
  const totalBranchCommits = Math.max(totalCommits, Number(snapshot?.data?.branchScopeStats?.allBranches?.totalCommits ?? 0));
  const defaultBranchName = snapshot?.data?.branchScopeStats?.defaultBranch?.branch || "main";
  const commitsByBranch = snapshot?.data?.branchScopeStats?.allBranches?.commitsByBranch ?? {};

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

  const sectionLabels = {
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
              <div className="github-chart-section__tab-header github-chart-section__tab-header-card">
                <p className="github-chart-section__tab-kicker">Team charts</p>
                <h4 className="github-chart-section__tab-title">Repository analytics charts</h4>
                <p className="muted github-chart-section__tab-description">
                  Commit and line-change trends across the linked repository.
                </p>
              </div>
              <RepositoryAnalyticsCharts
                commitTimelineSeries={commitTimelineSeries}
                lineChangesByDaySeries={lineChangesByDaySeries}
                weeklyCommitSeries={weeklyCommitSeries}
                lineChangeDomain={lineChangeDomain}
              />
            </div>
          ) : null}

          {activeActivityTab === "contributors" ? (
            <div className="github-chart-section__tab-content">
              <div className="github-chart-section__tab-header github-chart-section__tab-header-card">
                <p className="github-chart-section__tab-kicker">Contributors</p>
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
              <div className="github-chart-section__tab-header github-chart-section__tab-header-card">
                <p className="github-chart-section__tab-kicker">Branch activity</p>
                <h4 className="github-chart-section__tab-title">Branch activity</h4>
                <p className="muted github-chart-section__tab-description">
                  Branch coverage and recent commit trails across repository branches.
                </p>
              </div>
              <BranchActivity
                totalBranchCommits={totalBranchCommits}
                branchCount={branchCount}
                defaultBranchName={defaultBranchName}
                commitsByBranch={commitsByBranch}
                liveBranches={liveBranches}
                liveBranchesLoading={liveBranchesLoading}
                liveBranchesError={liveBranchesError}
                liveBranchesRefreshing={liveBranchesRefreshing}
                selectedBranch={selectedBranch}
                onSelectBranch={onSelectBranch}
                branchCommits={branchCommits}
                branchCommitsLoading={branchCommitsLoading}
                branchCommitsError={branchCommitsError}
                onRefreshBranches={onRefreshBranches}
              />
            </div>
          ) : null}
        </div>
      </GithubSectionContainer>
    </section>
  );
}
