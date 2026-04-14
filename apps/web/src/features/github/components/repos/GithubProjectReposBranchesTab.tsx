"use client";

import { Button } from "@/shared/ui/Button";
import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  ProjectGithubRepoLink,
} from "../../types";

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
  onSelectBranch: (linkId: number, branch: string) => void;
};

function formatCommitDate(value: string | null) {
  if (!value) {return "Unknown date";}
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {return value;}
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
        {loading ? (
          <div role="status" aria-live="polite">
            <SkeletonText lines={1} widths={["34%"]} />
            <span className="ui-visually-hidden">Loading branch data...</span>
          </div>
        ) : null}
        {!loading && links.length === 0 ? <p className="muted">No linked repository available.</p> : null}

        {!loading &&
          links.map((link) => {
            const snapshot = latestSnapshotByLinkId[link.id];
            const branchData = liveBranchesByLinkId[link.id];
            const selectedBranch = selectedBranchByLinkId[link.id] || "";
            const selectedBranchCommitCount =
              typeof snapshot?.data?.branchScopeStats?.allBranches?.commitsByBranch?.[selectedBranch] === "number"
                ? Number(snapshot.data?.branchScopeStats?.allBranches?.commitsByBranch?.[selectedBranch] ?? 0)
                : null;
            const currentBranchCommits = branchCommitsByLinkId[link.id]?.commits ?? [];

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
                      {branchData?.branches?.length ?? 0} branch{(branchData?.branches?.length ?? 0) === 1 ? "" : "es"}
                    </span>
                    {selectedBranchCommitCount != null ? (
                      <span className="github-repo-link-card__chip">{selectedBranchCommitCount} snapshot commits</span>
                    ) : null}
                  </div>
                </div>

                {liveBranchesLoadingByLinkId[link.id] ? (
                  <div className="github-repos-tab__table-wrap" role="status" aria-live="polite">
                    <SkeletonText lines={1} widths={["26%"]} />
                    <span className="ui-visually-hidden">Loading branches...</span>
                  </div>
                ) : null}

                {liveBranchesErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">
                    Failed to load branches: {liveBranchesErrorByLinkId[link.id]}
                  </p>
                ) : null}

                {!liveBranchesLoadingByLinkId[link.id] &&
                !liveBranchesErrorByLinkId[link.id] &&
                (branchData?.branches?.length ?? 0) === 0 ? (
                  <p className="muted github-repos-tab__table-wrap">No branches returned for this repository.</p>
                ) : null}

                {(branchData?.branches?.length ?? 0) > 0 ? (
                  <div className="stack github-repos-tab__select-wrap">
                    <label className="muted" htmlFor={`branch-commit-select-${link.id}`}>
                      Branch
                    </label>
                    <select
                      id={`branch-commit-select-${link.id}`}
                      className="github-repos-tab__select"
                      value={selectedBranch}
                      onChange={(event) => onSelectBranch(link.id, event.target.value)}
                      disabled={Boolean(liveBranchesLoadingByLinkId[link.id])}
                    >
                      {branchData?.branches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name}
                          {branch.isDefault ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {branchCommitsLoadingByLinkId[link.id] ? (
                  <div className="github-repos-tab__table-wrap" role="status" aria-live="polite">
                    <SkeletonText lines={1} widths={["38%"]} />
                    <span className="ui-visually-hidden">Loading recent commits...</span>
                  </div>
                ) : null}

                {branchCommitsErrorByLinkId[link.id] ? (
                  <p className="muted github-repos-tab__table-wrap">
                    Failed to load commits: {branchCommitsErrorByLinkId[link.id]}
                  </p>
                ) : null}

                {!branchCommitsLoadingByLinkId[link.id] &&
                !branchCommitsErrorByLinkId[link.id] &&
                selectedBranch &&
                currentBranchCommits.length === 0 ? (
                  <p className="muted github-repos-tab__table-wrap">No commits returned for this branch.</p>
                ) : null}

                {currentBranchCommits.length > 0 ? (
                  <div className="github-repos-tab__table-wrap stack" style={{ gap: 10 }}>
                    {currentBranchCommits.map((commit) => (
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
              </article>
            );
          })}
      </div>
    </section>
  );
}
