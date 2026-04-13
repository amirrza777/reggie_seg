"use client";

import { Button } from "@/shared/ui/Button";
import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";
import { formatNumber } from "./GithubRepoChartsDashboard.helpers";
import { GithubRepoMetricsGrid, type GithubDashboardMetric } from "./GithubRepoChartsDashboard.MetricGrid";
import type {
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
} from "../types";

function formatCommitTimestamp(value: string | null) {
  if (!value) {
    return "Unknown date";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function BranchActivityHeader({
  isRefreshing,
  onRefreshBranches,
}: {
  isRefreshing: boolean;
  onRefreshBranches?: () => void;
}) {
  return (
    <div className="github-repos-tab__header">
      <div className="github-repos-tab__title">
        <p className="github-repos-tab__kicker">Repository activity</p>
        <h3 className="github-repos-tab__heading">Branch commits</h3>
      </div>
      {onRefreshBranches ? (
        <Button variant="ghost" onClick={() => onRefreshBranches()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing branches..." : "Refresh branches"}
        </Button>
      ) : null}
    </div>
  );
}

function BranchCommitItem({
  commit,
}: {
  commit: NonNullable<GithubLiveProjectRepoBranchCommits>["commits"][number];
}) {
  const author = commit.authorLogin || commit.authorEmail || "unknown";
  const deltaText = `+${commit.additions ?? 0} / -${commit.deletions ?? 0}`;
  const showDelta = typeof commit.additions === "number" || typeof commit.deletions === "number";
  return (
    <div className="stack github-repos-tab__commit-cell">
      <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="github-repos-tab__commit-link">
        {commit.message || "(no message)"}
      </a>
      <div className="github-repos-tab__commit-meta-row">
        <span className="muted github-repos-tab__commit-meta">{commit.sha.slice(0, 8)} • {author}</span>
        <span className="muted github-repos-tab__commit-meta">{formatCommitTimestamp(commit.date)}</span>
        {showDelta ? <span className="muted github-repos-tab__commit-meta">{deltaText}</span> : null}
      </div>
    </div>
  );
}

function BranchCommitList({ commits }: { commits: NonNullable<GithubLiveProjectRepoBranchCommits>["commits"] }) {
  if (commits.length <= 0) {
    return null;
  }
  return (
    <div className="github-repos-tab__table-wrap stack" style={{ gap: 10 }}>
      {commits.map((commit) => (
        <BranchCommitItem key={commit.sha} commit={commit} />
      ))}
    </div>
  );
}

type BranchSelectorProps = {
  selectedBranch: string;
  branches: NonNullable<GithubLiveProjectRepoBranches>["branches"];
  selectedBranchCommitCount: number | null;
  liveBranchesLoading: boolean;
  onSelectBranch?: (branchName: string) => void;
};

function BranchSelector({ selectedBranch, branches, selectedBranchCommitCount, liveBranchesLoading, onSelectBranch }: BranchSelectorProps) {
  return (
    <div className="stack github-repos-tab__select-wrap">
      <label className="muted" htmlFor="branch-activity-select">Select branch</label>
      <select
        id="branch-activity-select"
        className="github-repos-tab__select"
        value={selectedBranch}
        onChange={(event) => onSelectBranch?.(event.target.value)}
        disabled={liveBranchesLoading}
      >
        {branches.map((branch) => (
          <option key={branch.name} value={branch.name}>{branch.name}{branch.isDefault ? " (default)" : ""}</option>
        ))}
      </select>
      {selectedBranchCommitCount != null ? <p className="muted">{formatNumber(selectedBranchCommitCount)} snapshot commits</p> : null}
    </div>
  );
}

function BranchLoadingState() {
  return (
    <div className="github-repos-tab__table-wrap" role="status" aria-live="polite">
      <SkeletonText lines={1} widths={["26%"]} />
      <span className="ui-visually-hidden">Loading branches...</span>
    </div>
  );
}

function BranchSelectorState({ branches, selectedBranch, selectedBranchCommitCount, liveBranchesLoading, onSelectBranch }: BranchSelectorProps) {
  if (branches.length > 0) {
    return <BranchSelector {...{ selectedBranch, branches, selectedBranchCommitCount, liveBranchesLoading, onSelectBranch }} />;
  }
  if (liveBranchesLoading) {
    return <BranchLoadingState />;
  }
  return <p className="muted github-repos-tab__table-wrap">No branches returned for this repository.</p>;
}

function BranchCommitsStatus({
  loading,
  error,
  selectedBranch,
  commits,
}: {
  loading: boolean;
  error: string | null;
  selectedBranch: string;
  commits: NonNullable<GithubLiveProjectRepoBranchCommits>["commits"];
}) {
  if (loading) {
    return (
      <div className="github-repos-tab__table-wrap" role="status" aria-live="polite">
        <SkeletonText lines={1} widths={["38%"]} />
        <span className="ui-visually-hidden">Loading recent commits...</span>
      </div>
    );
  }
  if (error) {
    return <p className="muted github-repos-tab__table-wrap">Failed to load commits: {error}</p>;
  }
  if (selectedBranch && commits.length === 0) {
    return <p className="muted github-repos-tab__table-wrap">No commits returned for this branch.</p>;
  }
  return null;
}

function buildBranchMetrics(defaultBranchName: string, branchCount: number, totalBranchCommits: number) {
  return [
    { label: "Default branch", value: defaultBranchName },
    { label: "Tracked branches", value: formatNumber(branchCount) },
    { label: "All branch commits", value: formatNumber(totalBranchCommits) },
  ] as GithubDashboardMetric[];
}

export type BranchActivitySectionProps = {
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
};

type BranchActivityPanelProps = {
  metrics: GithubDashboardMetric[];
  branchRows: NonNullable<GithubLiveProjectRepoBranches>["branches"];
  selectedBranch: string;
  selectedBranchCommitCount: number | null;
  liveBranchesLoading: boolean;
  liveBranchesError: string | null;
  onSelectBranch?: (branchName: string) => void;
  commits: NonNullable<GithubLiveProjectRepoBranchCommits>["commits"];
  branchCommitsLoading: boolean;
  branchCommitsError: string | null;
  isRefreshing: boolean;
  onRefreshBranches?: () => void;
};

function BranchActivityHelperText() {
  return (
    <p className="muted github-repos-tab__helper">
      Select a branch to inspect recent commits. The selector defaults to <strong>main</strong> when available.
    </p>
  );
}

function BranchActivityPanel(props: BranchActivityPanelProps) {
  const { metrics, ...detailProps } = props;
  return (
    <>
      <GithubRepoMetricsGrid metrics={metrics} />
      <BranchActivityDetailPanel {...detailProps} />
    </>
  );
}

function BranchActivityDetailPanel(props: Omit<BranchActivityPanelProps, "metrics">) {
  const { branchRows, selectedBranch, selectedBranchCommitCount, liveBranchesLoading, liveBranchesError, onSelectBranch, commits, branchCommitsLoading, branchCommitsError, isRefreshing, onRefreshBranches } = props;
  return (
    <div className="github-chart-section__panel github-chart-section__panel--full">
      <BranchActivityHeader isRefreshing={isRefreshing} onRefreshBranches={onRefreshBranches} />
      <BranchActivityHelperText />
      {liveBranchesError ? <p className="muted github-repos-tab__table-wrap">Failed to load branches: {liveBranchesError}</p> : null}
      <BranchSelectorState
        branches={branchRows}
        selectedBranch={selectedBranch}
        selectedBranchCommitCount={selectedBranchCommitCount}
        liveBranchesLoading={liveBranchesLoading}
        onSelectBranch={onSelectBranch}
      />
      <BranchCommitsStatus loading={branchCommitsLoading} error={branchCommitsError} selectedBranch={selectedBranch} commits={commits} />
      <BranchCommitList commits={commits} />
    </div>
  );
}

export function BranchActivitySection(props: BranchActivitySectionProps) {
  const metrics = buildBranchMetrics(props.defaultBranchName, props.branchCount, props.totalBranchCommits);
  const branchRows = props.liveBranches?.branches ?? [];
  const commits = props.branchCommits?.commits ?? [];
  const selectedBranchCommitCount =
    typeof props.commitsByBranch[props.selectedBranch] === "number"
      ? Number(props.commitsByBranch[props.selectedBranch])
      : null;
  const isRefreshing = props.liveBranchesLoading || props.liveBranchesRefreshing;
  return (
    <BranchActivityPanel
      metrics={metrics}
      branchRows={branchRows}
      selectedBranch={props.selectedBranch}
      selectedBranchCommitCount={selectedBranchCommitCount}
      liveBranchesLoading={props.liveBranchesLoading}
      liveBranchesError={props.liveBranchesError}
      onSelectBranch={props.onSelectBranch}
      commits={commits}
      branchCommitsLoading={props.branchCommitsLoading}
      branchCommitsError={props.branchCommitsError}
      isRefreshing={isRefreshing}
      onRefreshBranches={props.onRefreshBranches}
    />
  );
}
