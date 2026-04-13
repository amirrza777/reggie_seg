"use client";

import { GithubDonutChartCard } from "../GithubDonutChartCard";
import { GithubContributorCard } from "../GithubContributorCard";
import { WeeklyCommitTotalsChart } from "./GithubRepoChartsDashboard.AnalyticsCharts";
import { CommitTimelineChart } from "./GithubRepoChartsDashboard.CommitTimelineChart";
import { githubRepoChartInfo as chartInfo } from "./GithubRepoChartsDashboard.info";
import {
  buildCommitTimelineSeries,
  buildContributorRows,
  buildPersonalShareSeries,
  buildWeeklyCommitSeries,
  formatNumber,
  formatPercent,
  getChartMinWidth,
  getContributorWeeklyActivity,
  getDateTickInterval,
} from "./GithubRepoChartsDashboard.helpers";
import { GithubRepoMetricsGrid, type GithubDashboardMetric } from "./GithubRepoChartsDashboard.MetricGrid";
import { GithubSectionContainer } from "../GithubSectionContainer";

export { BranchActivitySection } from "./GithubRepoChartsDashboard.BranchActivitySection";

export function DashboardEmptyState() {
  return <p className="muted">No chart data available for this snapshot yet.</p>;
}

function getContributorWeeklyDenominator(contributors: ReturnType<typeof buildContributorRows>) {
  return contributors.reduce((max, contributor) => {
    const activity = getContributorWeeklyActivity(contributor.commitsByDay);
    return Math.max(max, activity.activeWeeks);
  }, 0);
}

type ContributorBreakdownSectionProps = {
  contributors: ReturnType<typeof buildContributorRows>;
  repositoryFullName?: string | null;
};

export function ContributorBreakdownSection({
  contributors,
  repositoryFullName,
}: ContributorBreakdownSectionProps) {
  if (contributors.length <= 0) {
    return <DashboardEmptyState />;
  }
  const weeklyDenominator = getContributorWeeklyDenominator(contributors);
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

function buildPersonalTimeline(commitTimelineSeries: ReturnType<typeof buildCommitTimelineSeries>) {
  return commitTimelineSeries.map((row) => ({
    date: row.date,
    commits: Number(row.personalCommits ?? 0),
  }));
}

function buildPersonalMetrics(personalShares: ReturnType<typeof buildPersonalShareSeries>) {
  return [
    { label: "Your commits", value: formatNumber(personalShares.personalCommits) },
    { label: "Your line changes", value: formatNumber(personalShares.personalLineChanges) },
    { label: "Commit share", value: formatPercent(personalShares.personalCommits, personalShares.totalCommits) },
    { label: "Line share", value: formatPercent(personalShares.personalLineChanges, personalShares.totalLineChanges) },
  ] as GithubDashboardMetric[];
}

function PersonalShareCharts({ personalShares }: { personalShares: ReturnType<typeof buildPersonalShareSeries> }) {
  return (
    <>
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
    </>
  );
}

function PersonalTimelineChart({
  timeline,
  timelineMinWidth,
  timelineTickInterval,
}: {
  timeline: Array<{ date: string; commits: number }>;
  timelineMinWidth: number;
  timelineTickInterval: number;
}) {
  if (timeline.length <= 0) {
    return null;
  }
  return (
    <CommitTimelineChart
      title="My commits over time"
      info={chartInfo.personalCommitsTimeline}
      data={timeline}
      minChartWidth={timelineMinWidth}
      tickInterval={timelineTickInterval}
      barName="Commits"
      barCategoryGap="30%"
      maxBarSize={14}
      size="full"
    />
  );
}

function PersonalWeeklyChart({
  personalWeeklySeries,
  weeklyMinWidth,
  weeklyTickInterval,
}: {
  personalWeeklySeries: ReturnType<typeof buildWeeklyCommitSeries>;
  weeklyMinWidth: number;
  weeklyTickInterval: number;
}) {
  if (personalWeeklySeries.length <= 0) {
    return null;
  }
  return (
    <WeeklyCommitTotalsChart
      title="My weekly commit totals"
      info={chartInfo.personalWeeklyCommits}
      data={personalWeeklySeries}
      minChartWidth={weeklyMinWidth}
      tickInterval={weeklyTickInterval}
      size="full"
    />
  );
}

function PersonalTrendCharts({
  timeline,
  personalWeeklySeries,
  timelineMinWidth,
  weeklyMinWidth,
  timelineTickInterval,
  weeklyTickInterval,
}: {
  timeline: Array<{ date: string; commits: number }>;
  personalWeeklySeries: ReturnType<typeof buildWeeklyCommitSeries>;
  timelineMinWidth: number;
  weeklyMinWidth: number;
  timelineTickInterval: number;
  weeklyTickInterval: number;
}) {
  return (
    <>
      <PersonalTimelineChart
        timeline={timeline}
        timelineMinWidth={timelineMinWidth}
        timelineTickInterval={timelineTickInterval}
      />
      <PersonalWeeklyChart
        personalWeeklySeries={personalWeeklySeries}
        weeklyMinWidth={weeklyMinWidth}
        weeklyTickInterval={weeklyTickInterval}
      />
    </>
  );
}

type PersonalActivitySectionProps = {
  commitTimelineSeries: ReturnType<typeof buildCommitTimelineSeries>;
  personalWeeklySeries: ReturnType<typeof buildWeeklyCommitSeries>;
  personalShares: ReturnType<typeof buildPersonalShareSeries>;
};

function buildPersonalTrendProps(
  timeline: Array<{ date: string; commits: number }>,
  personalWeeklySeries: ReturnType<typeof buildWeeklyCommitSeries>
) {
  const trendChartProps = {
    timeline,
    personalWeeklySeries,
    timelineMinWidth: getChartMinWidth(timeline.length, { base: 620, pointWidth: 28, max: 1500 }),
    weeklyMinWidth: getChartMinWidth(personalWeeklySeries.length, { base: 520, pointWidth: 60, max: 980 }),
    timelineTickInterval: getDateTickInterval(timeline.length, { maxTicks: 9 }),
    weeklyTickInterval: getDateTickInterval(personalWeeklySeries.length, { maxTicks: 12 }),
  };
  return trendChartProps;
}

export function PersonalActivitySection(props: PersonalActivitySectionProps) {
  const timeline = buildPersonalTimeline(props.commitTimelineSeries);
  const metrics = buildPersonalMetrics(props.personalShares);
  const trendChartProps = buildPersonalTrendProps(timeline, props.personalWeeklySeries);
  return (
    <GithubSectionContainer
      kicker="My code activity"
      title="Personal contribution analytics"
      description="Your contribution share and commit rhythm based on the latest repository snapshot."
    >
      <GithubRepoMetricsGrid metrics={metrics} />
      <div className="github-chart-section__grid">
        <PersonalShareCharts personalShares={props.personalShares} />
        <PersonalTrendCharts {...trendChartProps} />
      </div>
    </GithubSectionContainer>
  );
}
