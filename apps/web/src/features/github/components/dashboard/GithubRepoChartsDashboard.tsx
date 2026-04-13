"use client";

import { useState, type ReactNode } from "react";
import { RepositoryAnalyticsCharts } from "./GithubRepoChartsDashboard.AnalyticsCharts";
import {
  BranchActivitySection,
  ContributorBreakdownSection,
  DashboardEmptyState,
  PersonalActivitySection,
} from "./GithubRepoChartsDashboard.ActivitySections";
import {
  buildCommitTimelineSeries,
  buildContributorRows,
  buildLineChangesByDaySeries,
  buildPersonalShareSeries,
  buildWeeklyCommitSeries,
  formatNumber,
  getLineChangeDomain,
  getSnapshotRepoTotals,
} from "./GithubRepoChartsDashboard.helpers";
import { GithubRepoMetricsGrid, type GithubDashboardMetric } from "./GithubRepoChartsDashboard.MetricGrid";
import { GithubSectionContainer } from "../GithubSectionContainer";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubMappingCoverage,
} from "../types";

type ChartViewMode = "team" | "personal" | "staff";
type DashboardMode = "team" | "personal";
type TeamActivityTab = "teamCharts" | "contributors" | "branchActivity";

type TeamTabConfig = { key: TeamActivityTab; label: string };
type TeamTabDetails = { kicker: string; title: string; description: string };

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

type DashboardPreparedData = {
  commitTimelineSeries: ReturnType<typeof buildCommitTimelineSeries>;
  lineChangesByDaySeries: ReturnType<typeof buildLineChangesByDaySeries>;
  weeklyCommitSeries: ReturnType<typeof buildWeeklyCommitSeries>;
  contributors: ReturnType<typeof buildContributorRows>;
  lineChangeDomain: ReturnType<typeof getLineChangeDomain>;
  personalShares: ReturnType<typeof buildPersonalShareSeries>;
  personalWeeklySeries: ReturnType<typeof buildWeeklyCommitSeries>;
  totals: ReturnType<typeof getSnapshotRepoTotals>;
  totalCommits: number;
  totalBranchCommits: number;
  branchCount: number;
  defaultBranchName: string;
  commitsByBranch: Record<string, number>;
};

type TeamViewBindings = {
  repositoryFullName?: string | null;
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
};

const TEAM_ACTIVITY_TABS: TeamTabConfig[] = [
  { key: "teamCharts", label: "Team charts" },
  { key: "contributors", label: "Contributors" },
  { key: "branchActivity", label: "Branch activity" },
];

const TEAM_TAB_DETAILS: Record<TeamActivityTab, TeamTabDetails> = {
  teamCharts: {
    kicker: "Team charts",
    title: "Repository analytics charts",
    description: "Commit and line-change trends across the linked repository.",
  },
  contributors: {
    kicker: "Contributors",
    title: "Contributor breakdown",
    description: "Ranked contributor cards with commits, line deltas, and mini activity charts.",
  },
  branchActivity: {
    kicker: "Branch activity",
    title: "Branch activity",
    description: "Branch coverage and recent commit trails across repository branches.",
  },
};

function resolveDashboardMode(viewMode: ChartViewMode | undefined): DashboardMode {
  return viewMode === "personal" ? "personal" : "team";
}

function resolveTotalCommits(snapshot: GithubLatestSnapshot["snapshot"] | null, fallback: number) {
  const repoDefaultBranchCommits = snapshot?.repoStats?.[0]?.defaultBranchCommits;
  const scopedDefaultBranchCommits = snapshot?.data?.branchScopeStats?.defaultBranch?.totalCommits;
  return Number(repoDefaultBranchCommits ?? scopedDefaultBranchCommits ?? fallback);
}

function hasRenderableData(data: DashboardPreparedData) {
  return (
    data.commitTimelineSeries.length > 0 ||
    data.lineChangesByDaySeries.length > 0 ||
    data.weeklyCommitSeries.length > 0 ||
    data.contributors.length > 0 ||
    data.personalShares.commitShare.length > 0 ||
    data.personalShares.lineShare.length > 0
  );
}

function buildTeamMetrics(totalCommits: number, totals: ReturnType<typeof getSnapshotRepoTotals>) {
  return [
    { label: "Total commits", value: formatNumber(totalCommits) },
    { label: "Contributors", value: formatNumber(totals.totalContributors) },
    { label: "Additions", value: formatNumber(totals.totalAdditions) },
    { label: "Deletions", value: formatNumber(totals.totalDeletions) },
  ] as GithubDashboardMetric[];
}

function buildSeriesCollections(snapshot: GithubLatestSnapshot["snapshot"] | null, currentGithubLogin: string | null, mode: DashboardMode) {
  const commitTimelineSeries = buildCommitTimelineSeries(snapshot, currentGithubLogin, {
    includePersonal: mode === "personal",
  });
  return {
    commitTimelineSeries,
    lineChangesByDaySeries: buildLineChangesByDaySeries(snapshot),
    contributors: buildContributorRows(snapshot),
    personalShares: buildPersonalShareSeries({ snapshot, currentGithubLogin }),
  };
}

function buildWeeklyCollections(commitTimelineSeries: ReturnType<typeof buildCommitTimelineSeries>) {
  const weeklyCommitSeries = buildWeeklyCommitSeries(commitTimelineSeries.map((row) => ({ date: row.date, commits: row.commits })));
  const personalWeeklySeries = buildWeeklyCommitSeries(commitTimelineSeries.map((row) => ({ date: row.date, commits: Number(row.personalCommits ?? 0) })));
  return { weeklyCommitSeries, personalWeeklySeries };
}

function getAllBranchStats(snapshot: GithubLatestSnapshot["snapshot"] | null) {
  return snapshot?.data?.branchScopeStats?.allBranches ?? null;
}

function getDefaultBranchName(snapshot: GithubLatestSnapshot["snapshot"] | null) {
  return snapshot?.data?.branchScopeStats?.defaultBranch?.branch || "main";
}

function getBranchCount(allBranchStats: ReturnType<typeof getAllBranchStats>) {
  return Number(allBranchStats?.branchCount ?? 0);
}

function getCommitsByBranch(allBranchStats: ReturnType<typeof getAllBranchStats>) {
  return allBranchStats?.commitsByBranch ?? {};
}

function getAllBranchCommitTotal(allBranchStats: ReturnType<typeof getAllBranchStats>) {
  return Number(allBranchStats?.totalCommits ?? 0);
}

function buildBranchCollections(snapshot: GithubLatestSnapshot["snapshot"] | null, totalCommits: number) {
  const allBranchStats = getAllBranchStats(snapshot);
  const totalBranchCommits = Math.max(totalCommits, getAllBranchCommitTotal(allBranchStats));
  const branchCount = getBranchCount(allBranchStats);
  const commitsByBranch = getCommitsByBranch(allBranchStats);
  const defaultBranchName = getDefaultBranchName(snapshot);
  return { totalBranchCommits, branchCount, commitsByBranch, defaultBranchName };
}

function useDashboardPreparedData(snapshot: GithubLatestSnapshot["snapshot"] | null, currentGithubLogin: string | null, mode: DashboardMode): DashboardPreparedData {
  const series = buildSeriesCollections(snapshot, currentGithubLogin, mode);
  const weekly = buildWeeklyCollections(series.commitTimelineSeries);
  const lineChangeDomain = getLineChangeDomain(series.lineChangesByDaySeries);
  const totals = getSnapshotRepoTotals(snapshot);
  const totalCommits = resolveTotalCommits(snapshot, totals.totalCommits);
  const branch = buildBranchCollections(snapshot, totalCommits);
  return {
    ...series,
    ...weekly,
    lineChangeDomain,
    totals,
    totalCommits,
    ...branch,
  };
}

function ActivityTabPanel({ kicker, title, description, children }: TeamTabDetails & { children: ReactNode }) {
  return (
    <div className="github-chart-section__tab-content">
      <div className="github-chart-section__tab-header github-chart-section__tab-header-card">
        <p className="github-chart-section__tab-kicker">{kicker}</p>
        <h4 className="github-chart-section__tab-title">{title}</h4>
        <p className="muted github-chart-section__tab-description">{description}</p>
      </div>
      {children}
    </div>
  );
}

function TeamActivityTabs({ activeTab, onSelectTab }: { activeTab: TeamActivityTab; onSelectTab: (tab: TeamActivityTab) => void; }) {
  return (
    <nav className="github-chart-section__subnav" role="tablist" aria-label="Team code activity sections">
      {TEAM_ACTIVITY_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            id={`activity-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`activity-panel-${tab.key}`}
            className={`github-chart-section__subnav-btn${isActive ? " is-active" : ""}`}
            onClick={() => onSelectTab(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function TeamChartsTab({ data }: { data: DashboardPreparedData }) {
  return (
    <RepositoryAnalyticsCharts
      commitTimelineSeries={data.commitTimelineSeries}
      lineChangesByDaySeries={data.lineChangesByDaySeries}
      weeklyCommitSeries={data.weeklyCommitSeries}
      lineChangeDomain={data.lineChangeDomain}
    />
  );
}

function ContributorTab({ data, repositoryFullName }: { data: DashboardPreparedData; repositoryFullName?: string | null; }) {
  return <ContributorBreakdownSection contributors={data.contributors} repositoryFullName={repositoryFullName} />;
}

function BranchActivityTab({ data, bindings }: { data: DashboardPreparedData; bindings: TeamViewBindings }) {
  return (
    <BranchActivitySection
      totalBranchCommits={data.totalBranchCommits}
      branchCount={data.branchCount}
      defaultBranchName={data.defaultBranchName}
      commitsByBranch={data.commitsByBranch}
      liveBranches={bindings.liveBranches}
      liveBranchesLoading={bindings.liveBranchesLoading}
      liveBranchesError={bindings.liveBranchesError}
      liveBranchesRefreshing={bindings.liveBranchesRefreshing}
      selectedBranch={bindings.selectedBranch}
      onSelectBranch={bindings.onSelectBranch}
      branchCommits={bindings.branchCommits}
      branchCommitsLoading={bindings.branchCommitsLoading}
      branchCommitsError={bindings.branchCommitsError}
      onRefreshBranches={bindings.onRefreshBranches}
    />
  );
}

function TeamActivityContent({ activeTab, data, bindings }: { activeTab: TeamActivityTab; data: DashboardPreparedData; bindings: TeamViewBindings; }) {
  const details = TEAM_TAB_DETAILS[activeTab];
  const contentByTab: Record<TeamActivityTab, ReactNode> = {
    teamCharts: <TeamChartsTab data={data} />,
    contributors: <ContributorTab data={data} repositoryFullName={bindings.repositoryFullName} />,
    branchActivity: <BranchActivityTab data={data} bindings={bindings} />,
  };
  return <ActivityTabPanel {...details}>{contentByTab[activeTab]}</ActivityTabPanel>;
}

function TeamModeLayout({ activeTab, onSelectTab, metrics, content }: { activeTab: TeamActivityTab; onSelectTab: (tab: TeamActivityTab) => void; metrics: GithubDashboardMetric[]; content: ReactNode; }) {
  return (
    <section className="github-chart-section" aria-label="Repository charts">
      <GithubSectionContainer
        kicker="Repository Analytics"
        title="Team code activity"
        description="Team-level trends across commits and line changes with consistent date-based charts."
      >
        <GithubRepoMetricsGrid metrics={metrics} />
        <TeamActivityTabs activeTab={activeTab} onSelectTab={onSelectTab} />
        <div id={`activity-panel-${activeTab}`} role="tabpanel" aria-labelledby={`activity-tab-${activeTab}`} className="github-chart-section__tab-panel">
          {content}
        </div>
      </GithubSectionContainer>
    </section>
  );
}

function TeamModeDashboard({ data, bindings }: { data: DashboardPreparedData; bindings: TeamViewBindings }) {
  const [activeTab, setActiveTab] = useState<TeamActivityTab>("teamCharts");
  const metrics = buildTeamMetrics(data.totalCommits, data.totals);
  const content = <TeamActivityContent activeTab={activeTab} data={data} bindings={bindings} />;
  return <TeamModeLayout activeTab={activeTab} onSelectTab={setActiveTab} metrics={metrics} content={content} />;
}

function EmptyDataSection() {
  return (
    <section className="github-chart-section" aria-label="Repository charts">
      <DashboardEmptyState />
    </section>
  );
}

function PersonalModeSection({ data }: { data: DashboardPreparedData }) {
  return (
    <section className="github-chart-section" aria-label="My code activity charts">
      <PersonalActivitySection
        commitTimelineSeries={data.commitTimelineSeries}
        personalWeeklySeries={data.personalWeeklySeries}
        personalShares={data.personalShares}
      />
    </section>
  );
}

function normalizeTeamBindings(props: GithubRepoChartsDashboardProps): TeamViewBindings {
  return {
    repositoryFullName: props.repositoryFullName,
    liveBranches: props.liveBranches ?? null,
    liveBranchesLoading: props.liveBranchesLoading ?? false,
    liveBranchesError: props.liveBranchesError ?? null,
    liveBranchesRefreshing: props.liveBranchesRefreshing ?? false,
    selectedBranch: props.selectedBranch ?? "",
    onSelectBranch: props.onSelectBranch,
    branchCommits: props.branchCommits ?? null,
    branchCommitsLoading: props.branchCommitsLoading ?? false,
    branchCommitsError: props.branchCommitsError ?? null,
    onRefreshBranches: props.onRefreshBranches,
  };
}

export function GithubRepoChartsDashboard(props: GithubRepoChartsDashboardProps) {
  const mode = resolveDashboardMode(props.viewMode);
  const data = useDashboardPreparedData(props.snapshot, props.currentGithubLogin, mode);
  if (hasRenderableData(data) === false) {
    return <EmptyDataSection />;
  }
  if (mode === "personal") {
    return <PersonalModeSection data={data} />;
  }
  const bindings = normalizeTeamBindings(props);
  return <TeamModeDashboard data={data} bindings={bindings} />;
}
