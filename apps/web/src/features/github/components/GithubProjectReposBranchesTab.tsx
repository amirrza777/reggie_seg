"use client";

import { Button } from "@/shared/ui/Button";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  ProjectGithubRepoLink,
} from "../types";

type Props = {
  loading: boolean;
  liveBranchesRefreshing: boolean;
  links: ProjectGithubRepoLink[];
  latestSnapshotByLinkId: Record<number, GithubLatestSnapshot["snapshot"] | null>;
  liveBranchesByLinkId: Record<number, GithubLiveProjectRepoBranches | null>;
  liveBranchesLoadingByLinkId: Record<number, boolean>;
  liveBranchesErrorByLinkId: Record<number, string | null>;
  selectedBranchByLinkId: Record<number, string>;
  branchCommitsByLinkId: Record<number, GithubLiveProjectRepoBranchCommits | null>;
  branchCommitsLoadingByLinkId: Record<number, boolean>;
  branchCommitsErrorByLinkId: Record<number, string | null>;
  handleRefreshLiveBranches: () => Promise<void>;
  getBranchQuery: (linkId: number) => string;
  onBranchQueryChange: (linkId: number, query: string) => void;
  onSelectBranch: (linkId: number, branch: string) => void;
};

function formatCommitDate(value: string | null) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function GithubProjectReposBranchesTab({
  loading,
  liveBranchesRefreshing,
  links,
  latestSnapshotByLinkId,
  liveBranchesByLinkId,
  liveBranchesLoadingByLinkId,
  liveBranchesErrorByLinkId,
  selectedBranchByLinkId,
  branchCommitsByLinkId,
  branchCommitsLoadingByLinkId,
  branchCommitsErrorByLinkId,
  handleRefreshLiveBranches,
  getBranchQuery,
  onBranchQueryChange,
  onSelectBranch,
}: Props) {
  return (
    <section className="github-repos-tab github-repos-tab--activity" aria-label="Repository activity">
      <div className="github-repos-tab__header">
        <div className="github-repos-tab__title">
          <p className="github-repos-tab__kicker">Repository activity</p>
          <h2 className="github-repos-tab__heading">Branch commits</h2>
        </div>
        <Button variant="ghost" onClick={() => void handleRefreshLiveBranches()} disabled={loading || liveBranchesRefreshing}>
          {liveBranchesRefreshing ? "Refreshing branches..." : "Refresh branches"}
        </Button>
      </div>

      <p className="muted github-repos-tab__helper">
        Select a branch to inspect recent commits. The selector defaults to <strong>main</strong> when available.
      </p>

      <div className="github-repos-tab__list">
        {loading ? <p className="muted">Loading branch data...</p> : null}
        {!loading && links.length === 0 ? <p className="muted">No linked repository available.</p> : null}

        {!loading &&
          links.map((link) => {
            const snapshot = latestSnapshotByLinkId[link.id];
            const liveBranches = liveBranchesByLinkId[link.id];
            const branchSearchQuery = getBranchQuery(link.id);
            const allBranches = liveBranches?.branches ?? [];
            const selectedBranch = selectedBranchByLinkId[link.id];
            const selectedBranchItem = selectedBranch
              ? allBranches.find((branch) => branch.name === selectedBranch) ?? null
              : null;
            const visibleBranches = !selectedBranch
              ? allBranches
              : allBranches.some((branch) => branch.name === selectedBranch)
                ? allBranches
                : selectedBranchItem
                  ? [selectedBranchItem, ...allBranches]
                  : allBranches;
            const rows = allBranches.length > 0
              ? allBranches.map((branch) => [
                  branch.name,
                  branch.isDefault ? "Yes" : "No",
                  "-",
                  branch.aheadBy ?? "-",
                  branch.behindBy ?? "-",
                  branch.compareStatus ?? "-",
                ])
              : null;
            const commitCount = branchCommitsByLinkId[link.id]?.commits?.length ?? null;
            return (
              <article key={link.id} className="github-repos-tab__subpanel github-repos-tab__subpanel--activity">
                <div className="github-repos-tab__activity-head">
                  <div className="ui-stack-xs">
                    <strong>{link.repository.fullName}</strong>
                    <p className="muted">
                      Default branch: {link.repository.defaultBranch || "unknown"}
                      {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="github-repos-tab__activity-meta">
                    <span className="github-repo-link-card__chip">
                      {liveBranches?.branches?.length ?? 0} branch{(liveBranches?.branches?.length ?? 0) === 1 ? "" : "es"}
                    </span>
                    {commitCount != null ? (
                      <span className="github-repo-link-card__chip">{commitCount} commits</span>
                    ) : null}
                  </div>
                </div>

                {liveBranchesLoadingByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">Loading branches...</p>
                ) : null}

                {liveBranchesErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">
                    Failed to load branches: {liveBranchesErrorByLinkId[link.id]}
                  </p>
                ) : null}
                {!rows && !liveBranchesLoadingByLinkId[link.id] && !liveBranchesErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">No live branches returned for this repository.</p>
                ) : rows ? (
                  <>
                    <p className="muted github-repos-tab__table-wrap">
                      Branches are fetched live from GitHub. Commit counts are shown from the latest snapshot when available.
                    </p>
                    <div className="github-repos-tab__table-wrap">
                      <Table
                        headers={["Branch", "Default", "Commits (snapshot)", "Ahead of main", "Behind main", "Status"]}
                        rows={rows}
                      />
                    </div>
                    <div className="stack github-repos-tab__select-wrap">
                      <label className="muted" htmlFor={`branch-search-${link.id}`}>
                        Search branches
                      </label>
                      <SearchField
                        id={`branch-search-${link.id}`}
                        className="github-repos-tab__select"
                        value={branchSearchQuery}
                        onChange={(event) => onBranchQueryChange(link.id, event.target.value)}
                        placeholder="Search branch names"
                        aria-label={`Search branches for ${link.repository.fullName}`}
                        disabled={Boolean(liveBranchesLoadingByLinkId[link.id])}
                      />
                      <label className="muted" htmlFor={`branch-commit-select-${link.id}`}>
                        Select branch to view 10 most recent commits
                      </label>
                      <select
                        id={`branch-commit-select-${link.id}`}
                        className="github-repos-tab__select"
                        value={selectedBranchByLinkId[link.id] || ""}
                        onChange={(e) => onSelectBranch(link.id, e.target.value)}
                        disabled={Boolean(liveBranchesLoadingByLinkId[link.id])}
                      >
                        {visibleBranches.length === 0 ? (
                          <option value="">No branches match "{branchSearchQuery.trim()}"</option>
                        ) : null}
                        {visibleBranches.map((branch) => (
                          <option key={branch.name} value={branch.name}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {branchCommitsLoadingByLinkId[link.id] ? <p className="muted github-repos-tab__table-wrap">Loading recent commits...</p> : null}
                    {branchCommitsErrorByLinkId[link.id] ? (
                      <p className="muted github-repos-tab__table-wrap">
                        Failed to load branch commits: {branchCommitsErrorByLinkId[link.id]}
                      </p>
                    ) : null}
                    {branchCommitsByLinkId[link.id]?.commits?.length ? (
                      <div className="github-repos-tab__table-wrap stack" style={{ gap: 10 }}>
                        {branchCommitsByLinkId[link.id]!.commits.map((commit) => (
                          <div key={commit.sha} className="stack github-repos-tab__commit-cell">
                            <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="github-repos-tab__commit-link">
                              {commit.message || "(no message)"}
                            </a>
                            <div className="github-repos-tab__commit-meta-row">
                              <span className="muted github-repos-tab__commit-meta">
                                {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                              </span>
                              <span className="muted github-repos-tab__commit-meta">{formatCommitDate(commit.date)}</span>
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
                  </>
                ) : null}
              </article>
            );
          })}
      </div>
    </section>
  );
}
