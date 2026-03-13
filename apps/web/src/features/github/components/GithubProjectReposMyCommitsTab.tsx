"use client";

import { Button } from "@/shared/ui/Button";
import { Table } from "@/shared/ui/Table";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubLiveProjectRepoMyCommits,
  ProjectGithubRepoLink,
} from "../types";

type Props = {
  loading: boolean;
  connection: GithubConnectionStatus | null;
  links: ProjectGithubRepoLink[];
  latestSnapshotByLinkId: Record<number, GithubLatestSnapshot["snapshot"] | null>;
  myCommitsByLinkId: Record<number, GithubLiveProjectRepoMyCommits | null>;
  myCommitsLoadingByLinkId: Record<number, boolean>;
  myCommitsErrorByLinkId: Record<number, string | null>;
  fetchMyCommits: (linkId: number, page?: number, options?: { includeTotals?: boolean }) => Promise<void>;
};

export function GithubProjectReposMyCommitsTab({
  loading,
  connection,
  links,
  latestSnapshotByLinkId,
  myCommitsByLinkId,
  myCommitsLoadingByLinkId,
  myCommitsErrorByLinkId,
  fetchMyCommits,
}: Props) {
  return (
    <section className="github-repos-tab">
      <div className="github-repos-tab__title">
        <p className="github-repos-tab__kicker">Personal activity</p>
        <h2 className="github-repos-tab__heading">My commits</h2>
      </div>
      <div className="github-repos-tab__list">
        {loading ? <p className="muted">Loading commits...</p> : null}
        {!loading && !connection?.connected ? <p className="muted">Connect GitHub to view your commits.</p> : null}
        {!loading && connection?.connected && links.length === 0 ? (
          <p className="muted">Link a repository first to view your commits.</p>
        ) : null}
        {!loading &&
          connection?.connected &&
          links.map((link) => {
            const snapshot = latestSnapshotByLinkId[link.id];
            const myCommitData = myCommitsByLinkId[link.id];
            const currentPage = myCommitData?.page || 1;
            const totals = myCommitData?.totals;

            return (
              <div key={link.id} className="github-repos-tab__subpanel">
                <div className="ui-row ui-row--between ui-row--wrap">
                  <div className="ui-stack-xs">
                    <strong>{link.repository.fullName}</strong>
                    <p className="muted">
                      {connection?.account?.login ? `Showing commits for @${connection?.account?.login}` : "Showing your commits"}
                      {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="github-repos-tab__summary-grid">
                    <div className="github-repos-tab__summary-card">
                      <p className="muted github-repos-tab__summary-label">Commits</p>
                      <p className="github-repos-tab__summary-value github-repos-tab__summary-value--lg">
                        {typeof totals?.commits === "number" ? totals.commits.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div className="github-repos-tab__summary-card github-repos-tab__summary-card--accent">
                      <p className="muted github-repos-tab__summary-label">Lines (no merge PRs)</p>
                      <p className="github-repos-tab__summary-value">
                        +{typeof totals?.additionsExcludingMergePullRequests === "number" ? totals.additionsExcludingMergePullRequests.toLocaleString() : "-"}{" "}
                        / -{typeof totals?.deletionsExcludingMergePullRequests === "number" ? totals.deletionsExcludingMergePullRequests.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div className="github-repos-tab__summary-card">
                      <p className="muted github-repos-tab__summary-label">With merges</p>
                      <p className="github-repos-tab__summary-value">
                        +{typeof totals?.additionsIncludingMergePullRequests === "number" ? totals.additionsIncludingMergePullRequests.toLocaleString() : "-"}{" "}
                        / -{typeof totals?.deletionsIncludingMergePullRequests === "number" ? totals.deletionsIncludingMergePullRequests.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div className="github-repos-tab__summary-card">
                      <p className="muted github-repos-tab__summary-label">Merge PR commits</p>
                      <p className="github-repos-tab__summary-value">
                        {typeof totals?.mergePullRequestCommits === "number" ? totals.mergePullRequestCommits.toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {totals &&
                typeof totals.detailedCommitCount === "number" &&
                typeof totals.requestedCommitCount === "number" &&
                totals.detailedCommitCount < totals.requestedCommitCount ? (
                  <p className="muted github-repos-tab__summary-coverage">
                    Line totals coverage: {totals.detailedCommitCount}/{totals.requestedCommitCount} commits
                  </p>
                ) : null}

                {myCommitsLoadingByLinkId[link.id] ? <p className="muted github-repos-tab__table-wrap">Loading your commits...</p> : null}
                {myCommitsErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">
                    Failed to load commits: {myCommitsErrorByLinkId[link.id]}
                  </p>
                ) : null}

                {myCommitData?.commits?.length ? (
                  <>
                    <div className="github-repos-tab__table-wrap">
                      <Table
                        headers={["Commit", "Date", "Additions", "Deletions"]}
                        columnTemplate="minmax(0, 1.8fr) minmax(170px, 220px) minmax(90px, 110px) minmax(90px, 110px)"
                        rows={myCommitData.commits.map((commit) => [
                          <div key={commit.sha} className="stack github-repos-tab__commit-cell">
                            <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="github-repos-tab__commit-link">
                              {commit.message || "(no message)"}
                            </a>
                            <div className="github-repos-tab__commit-meta-row">
                              <span className="muted github-repos-tab__commit-meta">
                                {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                              </span>
                              {commit.isMergePullRequest ? (
                                <span className="github-repos-tab__merge-chip">
                                  Merge PR
                                </span>
                              ) : null}
                            </div>
                          </div>,
                          commit.date ? new Date(commit.date).toLocaleString() : "-",
                          commit.additions ?? "-",
                          commit.deletions ?? "-",
                        ])}
                      />
                    </div>
                    <div className="ui-row ui-row--between ui-row--wrap github-repos-tab__pager">
                      <p className="muted">Page {currentPage}</p>
                      <div className="github-repos-tab__pager-actions">
                        <Button
                          variant="ghost"
                          onClick={() => void fetchMyCommits(link.id, currentPage - 1)}
                          disabled={Boolean(myCommitsLoadingByLinkId[link.id]) || currentPage <= 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => void fetchMyCommits(link.id, currentPage + 1)}
                          disabled={Boolean(myCommitsLoadingByLinkId[link.id]) || !myCommitData.hasNextPage}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                ) : !myCommitsLoadingByLinkId[link.id] && !myCommitsErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">
                    No commits found for your GitHub account in this repository.
                  </p>
                ) : null}
              </div>
            );
          })}
      </div>
    </section>
  );
}
