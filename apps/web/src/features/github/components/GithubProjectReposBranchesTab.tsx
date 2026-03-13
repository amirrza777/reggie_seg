"use client";

import { Button } from "@/shared/ui/Button";
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
  buildBranchRows: (link: ProjectGithubRepoLink) => Array<(string | number | null)>[] | null;
  handleRefreshLiveBranches: () => Promise<void>;
  onSelectBranch: (linkId: number, branch: string) => void;
};

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
  buildBranchRows,
  handleRefreshLiveBranches,
  onSelectBranch,
}: Props) {
  return (
    <section className="github-repos-tab">
      <div className="ui-row ui-row--between ui-row--wrap">
        <div className="github-repos-tab__title">
          <p className="github-repos-tab__kicker">Live repository data</p>
          <h2 className="github-repos-tab__heading">Branches</h2>
        </div>
        <Button variant="ghost" onClick={() => void handleRefreshLiveBranches()} disabled={loading || liveBranchesRefreshing}>
          {liveBranchesRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <div className="github-repos-tab__list">
        {loading ? <p className="muted">Loading branch data...</p> : null}
        {!loading && links.length === 0 ? <p className="muted">No linked repository available.</p> : null}
        {!loading &&
          links.map((link) => {
            const snapshot = latestSnapshotByLinkId[link.id];
            const rows = buildBranchRows(link);
            return (
              <div key={link.id} className="github-repos-tab__subpanel">
                <div className="ui-row ui-row--between ui-row--wrap">
                  <div className="ui-stack-xs">
                    <strong>{link.repository.fullName}</strong>
                    <p className="muted">
                      Default branch: {link.repository.defaultBranch || "unknown"}
                      {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>
                {liveBranchesLoadingByLinkId[link.id] ? <p className="muted github-repos-tab__table-wrap">Loading live branches...</p> : null}
                {liveBranchesErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">
                    Failed to load live branches: {liveBranchesErrorByLinkId[link.id]}
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
                        {(liveBranchesByLinkId[link.id]?.branches || []).map((branch) => (
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
                      <div className="github-repos-tab__table-wrap">
                        <Table
                          headers={["Commit", "Date", "Additions", "Deletions"]}
                          columnTemplate="minmax(0, 1.8fr) minmax(170px, 220px) minmax(90px, 110px) minmax(90px, 110px)"
                          rows={branchCommitsByLinkId[link.id]!.commits.map((commit) => [
                            <div key={commit.sha} className="stack github-repos-tab__commit-cell">
                              <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="github-repos-tab__commit-link">
                                {commit.message || "(no message)"}
                              </a>
                              <span className="muted github-repos-tab__commit-meta">
                                {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                              </span>
                            </div>,
                            commit.date ? new Date(commit.date).toLocaleString() : "-",
                            commit.additions ?? "-",
                            commit.deletions ?? "-",
                          ])}
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
      </div>
    </section>
  );
}
