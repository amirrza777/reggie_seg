"use client";

import type React from "react";
import { Button } from "@/shared/ui/Button";
import { Table } from "@/shared/ui/Table";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  ProjectGithubRepoLink,
} from "../types";

type StylesMap = Record<string, React.CSSProperties>;

type Props = {
  styles: StylesMap;
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
  styles,
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
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleWrap}>
          <p style={styles.sectionKicker}>Live repository data</p>
          <strong>Branches</strong>
        </div>
        <Button variant="ghost" onClick={() => void handleRefreshLiveBranches()} disabled={loading || liveBranchesRefreshing}>
          {liveBranchesRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <div style={styles.list}>
        {loading ? <p className="muted">Loading branch data...</p> : null}
        {!loading && links.length === 0 ? <p className="muted">No linked repository available.</p> : null}
        {!loading &&
          links.map((link) => {
            const snapshot = latestSnapshotByLinkId[link.id];
            const rows = buildBranchRows(link);
            return (
              <div key={link.id} style={{ ...styles.panel, marginTop: 12, padding: 12 }}>
                <div style={styles.row}>
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{link.repository.fullName}</strong>
                    <p className="muted">
                      Default branch: {link.repository.defaultBranch || "unknown"}
                      {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>
                {liveBranchesLoadingByLinkId[link.id] ? <p className="muted" style={{ marginTop: 10 }}>Loading live branches...</p> : null}
                {liveBranchesErrorByLinkId[link.id] ? (
                  <p className="muted" style={{ marginTop: 10 }}>
                    Failed to load live branches: {liveBranchesErrorByLinkId[link.id]}
                  </p>
                ) : null}
                {!rows && !liveBranchesLoadingByLinkId[link.id] && !liveBranchesErrorByLinkId[link.id] ? (
                  <p className="muted" style={{ marginTop: 10 }}>No live branches returned for this repository.</p>
                ) : rows ? (
                  <>
                    <p className="muted" style={{ marginTop: 10 }}>
                      Branches are fetched live from GitHub. Commit counts are shown from the latest snapshot when available.
                    </p>
                    <div style={{ marginTop: 10 }}>
                      <Table
                        headers={["Branch", "Default", "Commits (snapshot)", "Ahead of main", "Behind main", "Status"]}
                        rows={rows}
                      />
                    </div>
                    <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                      <label className="muted" htmlFor={`branch-commit-select-${link.id}`}>
                        Select branch to view 10 most recent commits
                      </label>
                      <select
                        id={`branch-commit-select-${link.id}`}
                        style={styles.select}
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
                    {branchCommitsLoadingByLinkId[link.id] ? <p className="muted" style={{ marginTop: 10 }}>Loading recent commits...</p> : null}
                    {branchCommitsErrorByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        Failed to load branch commits: {branchCommitsErrorByLinkId[link.id]}
                      </p>
                    ) : null}
                    {branchCommitsByLinkId[link.id]?.commits?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <Table
                          headers={["Commit", "Date", "Additions", "Deletions"]}
                          columnTemplate="minmax(0, 1.8fr) minmax(170px, 220px) minmax(90px, 110px) minmax(90px, 110px)"
                          rows={branchCommitsByLinkId[link.id]!.commits.map((commit) => [
                            <div key={commit.sha} className="stack" style={{ gap: 2 }}>
                              <a href={commit.htmlUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                                {commit.message || "(no message)"}
                              </a>
                              <span className="muted" style={{ fontSize: 12 }}>
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
