"use client";

import type React from "react";
import { Button } from "@/shared/ui/Button";
import { Table } from "@/shared/ui/Table";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubLiveProjectRepoMyCommits,
  ProjectGithubRepoLink,
} from "../types";

type StylesMap = Record<string, React.CSSProperties>;

type Props = {
  styles: StylesMap;
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
  styles,
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
    <section style={styles.panel}>
      <div style={styles.sectionTitleWrap}>
        <p style={styles.sectionKicker}>Personal activity</p>
        <strong>My commits</strong>
      </div>
      <div style={styles.list}>
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
              <div key={link.id} style={{ ...styles.panel, marginTop: 12, padding: 12 }}>
                <div style={styles.row}>
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{link.repository.fullName}</strong>
                    <p className="muted">
                      {connection?.account?.login ? `Showing commits for @${connection?.account?.login}` : "Showing your commits"}
                      {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                      gap: 8,
                      width: "100%",
                      maxWidth: 760,
                    }}
                  >
                    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--surface)" }}>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Commits</p>
                      <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 18 }}>
                        {typeof totals?.commits === "number" ? totals.commits.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div
                      style={{
                        border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
                      }}
                    >
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Lines (no merge PRs)</p>
                      <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
                        +{typeof totals?.additionsExcludingMergePullRequests === "number" ? totals.additionsExcludingMergePullRequests.toLocaleString() : "-"}{" "}
                        / -{typeof totals?.deletionsExcludingMergePullRequests === "number" ? totals.deletionsExcludingMergePullRequests.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--surface)" }}>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>With merges</p>
                      <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
                        +{typeof totals?.additionsIncludingMergePullRequests === "number" ? totals.additionsIncludingMergePullRequests.toLocaleString() : "-"}{" "}
                        / -{typeof totals?.deletionsIncludingMergePullRequests === "number" ? totals.deletionsIncludingMergePullRequests.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--surface)" }}>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Merge PR commits</p>
                      <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
                        {typeof totals?.mergePullRequestCommits === "number" ? totals.mergePullRequestCommits.toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {totals &&
                typeof totals.detailedCommitCount === "number" &&
                typeof totals.requestedCommitCount === "number" &&
                totals.detailedCommitCount < totals.requestedCommitCount ? (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Line totals coverage: {totals.detailedCommitCount}/{totals.requestedCommitCount} commits
                  </p>
                ) : null}

                {myCommitsLoadingByLinkId[link.id] ? <p className="muted" style={{ marginTop: 10 }}>Loading your commits...</p> : null}
                {myCommitsErrorByLinkId[link.id] ? (
                  <p className="muted" style={{ marginTop: 10 }}>
                    Failed to load commits: {myCommitsErrorByLinkId[link.id]}
                  </p>
                ) : null}

                {myCommitData?.commits?.length ? (
                  <>
                    <div style={{ marginTop: 10 }}>
                      <Table
                        headers={["Commit", "Date", "Additions", "Deletions"]}
                        columnTemplate="minmax(0, 1.8fr) minmax(170px, 220px) minmax(90px, 110px) minmax(90px, 110px)"
                        rows={myCommitData.commits.map((commit) => [
                          <div key={commit.sha} className="stack" style={{ gap: 2 }}>
                            <a href={commit.htmlUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                              {commit.message || "(no message)"}
                            </a>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <span className="muted" style={{ fontSize: 12 }}>
                                {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                              </span>
                              {commit.isMergePullRequest ? (
                                <span
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 999,
                                    padding: "1px 8px",
                                    fontSize: 11,
                                    color: "var(--muted)",
                                    background: "var(--surface)",
                                  }}
                                >
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
                    <div style={{ ...styles.row, marginTop: 10 }}>
                      <p className="muted">Page {currentPage}</p>
                      <div style={{ display: "flex", gap: 8 }}>
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
                  <p className="muted" style={{ marginTop: 10 }}>
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
