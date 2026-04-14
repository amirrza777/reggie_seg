"use client";

import { Button } from "@/shared/ui/Button";
import { GithubRepoChartsDashboard } from "./dashboard/GithubRepoChartsDashboard";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubMappingCoverage,
  ProjectGithubRepoLink,
} from "../types";

type GithubRepoLinkCardProps = {
  link: ProjectGithubRepoLink;
  coverage: GithubMappingCoverage | null;
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  currentGithubLogin: string | null;
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
  busy?: boolean;
  loading?: boolean;
  removingLinkId?: number | null;
  onRemoveLink?: (linkId: number) => void;
  readOnly?: boolean;
  viewerMode?: "student" | "staff";
  chartMode?: "team" | "personal" | "staff";
};

function findPersonalStats(
  snapshot: GithubLatestSnapshot["snapshot"] | null,
  currentGithubLogin: string | null
) {
  const normalizedLogin = currentGithubLogin?.trim().toLowerCase();
  if (!normalizedLogin || !snapshot?.userStats?.length) {
    return null;
  }
  return (
    snapshot.userStats.find((entry) => entry.githubLogin?.trim().toLowerCase() === normalizedLogin) || null
  );
}

export function GithubRepoLinkCard({
  link,
  coverage,
  snapshot,
  currentGithubLogin,
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
  busy = false,
  loading = false,
  removingLinkId = null,
  onRemoveLink,
  readOnly = false,
  viewerMode = "student",
  chartMode,
}: GithubRepoLinkCardProps) {
  const resolvedChartMode = chartMode === "personal" ? "personal" : "team";
  const isPersonalMode = resolvedChartMode === "personal";

  const defaultBranchTotals = snapshot?.data?.branchScopeStats?.defaultBranch;
  const allBranchesTotals = snapshot?.data?.branchScopeStats?.allBranches;
  const fallbackRepoTotals = snapshot?.repoStats?.[0] ?? null;
  const analysedLabel = coverage?.analysedAt
    ? new Date(String(coverage.analysedAt)).toLocaleString()
    : "Not analysed yet";

  const defaultCommitCount = defaultBranchTotals?.totalCommits ?? fallbackRepoTotals?.totalCommits ?? 0;
  const defaultAdditionCount = defaultBranchTotals?.totalAdditions ?? fallbackRepoTotals?.totalAdditions ?? 0;
  const defaultDeletionCount = defaultBranchTotals?.totalDeletions ?? fallbackRepoTotals?.totalDeletions ?? 0;
  const allAdditionCount = Math.max(defaultAdditionCount, Number(allBranchesTotals?.totalAdditions ?? 0));
  const allDeletionCount = Math.max(defaultDeletionCount, Number(allBranchesTotals?.totalDeletions ?? 0));

  const personalStats = findPersonalStats(snapshot, currentGithubLogin);
  const canRemove = !readOnly && typeof onRemoveLink === "function";

  return (
    <article className={`github-repo-link-card${isPersonalMode ? " github-repo-link-card--personal" : ""}`}>
      <div className="github-repo-link-card__header">
        <div>
          <h2 className="github-repo-link-card__title">{link.repository.fullName}</h2>
          <div className="github-repo-link-card__meta-row">
            <span className="github-repo-link-card__chip">
              {link.repository.isPrivate ? "Private repository" : "Public repository"}
            </span>
            <span className="github-repo-link-card__chip">Default branch {link.repository.defaultBranch || "unknown"}</span>
            <span className="github-repo-link-card__chip">Analysed {analysedLabel}</span>
          </div>
        </div>
      </div>

      {isPersonalMode ? (
        <section className="github-repo-link-card__overview" aria-label="Personal overview">
          <p className="github-repo-link-card__section-label">My summary</p>
          <div className="github-repo-link-card__stats">
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">Your commits</div>
              <div className="github-repo-link-card__stat-value">
                {typeof personalStats?.commits === "number" ? personalStats.commits.toLocaleString() : "-"}
              </div>
            </div>
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">Your additions / deletions</div>
              <div className="github-repo-link-card__stat-value">
                {typeof personalStats?.additions === "number" ? personalStats.additions.toLocaleString() : "-"}{" "}
                <span className="github-repo-link-card__stat-subtle">
                  / {typeof personalStats?.deletions === "number" ? personalStats.deletions.toLocaleString() : "-"}
                </span>
              </div>
            </div>
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">Active coding days</div>
              <div className="github-repo-link-card__stat-value">
                {personalStats?.commitsByDay ? Object.values(personalStats.commitsByDay).filter((value) => Number(value) > 0).length : 0}
              </div>
            </div>
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">Team commits (snapshot)</div>
              <div className="github-repo-link-card__stat-value">{defaultCommitCount.toLocaleString()}</div>
            </div>
          </div>
        </section>
      ) : (
        <section className="github-repo-link-card__overview" aria-label="Repository overview">
          <p className="github-repo-link-card__section-label">Overview</p>
          <div className="github-repo-link-card__stats">
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">Default branch commits</div>
              <div className="github-repo-link-card__stat-value">{defaultCommitCount.toLocaleString()}</div>
            </div>
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">Default additions / deletions</div>
              <div className="github-repo-link-card__stat-value">
                {defaultAdditionCount.toLocaleString()} <span className="github-repo-link-card__stat-subtle">/ {defaultDeletionCount.toLocaleString()}</span>
              </div>
            </div>
            <div className="github-repo-link-card__stat">
              <div className="github-repo-link-card__stat-label">All additions / deletions</div>
              <div className="github-repo-link-card__stat-value">
                {allAdditionCount.toLocaleString()} <span className="github-repo-link-card__stat-subtle">/ {allDeletionCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <GithubRepoChartsDashboard
        snapshot={snapshot}
        coverage={coverage}
        currentGithubLogin={currentGithubLogin}
        viewerMode={viewerMode}
        viewMode={resolvedChartMode}
        repositoryFullName={link.repository.fullName}
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

      {canRemove ? (
        <div className="github-repo-link-card__actions">
          <Button
            variant="ghost"
            onClick={() => onRemoveLink(link.id)}
            disabled={busy || loading || removingLinkId === link.id}
          >
            {removingLinkId === link.id ? "Removing..." : "Remove link"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
