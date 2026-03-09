"use client";

import { Button } from "@/shared/ui/Button";
import { GithubRepoChartsDashboard } from "./GithubRepoChartsDashboard";
import type {
  GithubLatestSnapshot,
  GithubMappingCoverage,
  ProjectGithubRepoLink,
} from "../types";

type GithubRepoLinkCardProps = {
  link: ProjectGithubRepoLink;
  coverage: GithubMappingCoverage | null;
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  currentGithubLogin: string | null;
  busy?: boolean;
  loading?: boolean;
  removingLinkId?: number | null;
  onRemoveLink?: (linkId: number) => void;
  readOnly?: boolean;
  viewerMode?: "student" | "staff";
};

export function GithubRepoLinkCard({
  link,
  coverage,
  snapshot,
  currentGithubLogin,
  busy = false,
  loading = false,
  removingLinkId = null,
  onRemoveLink,
  readOnly = false,
  viewerMode = "student",
}: GithubRepoLinkCardProps) {
  const defaultBranchTotals = snapshot?.data?.branchScopeStats?.defaultBranch;
  const allBranchesTotals = snapshot?.data?.branchScopeStats?.allBranches;
  const fallbackRepoTotals = snapshot?.repoStats?.[0] ?? null;
  const analysedLabel = coverage?.analysedAt
    ? new Date(String(coverage.analysedAt)).toLocaleString()
    : "Not analysed yet";
  const defaultCommitCount = defaultBranchTotals?.totalCommits ?? fallbackRepoTotals?.totalCommits ?? 0;
  const defaultAdditionCount = defaultBranchTotals?.totalAdditions ?? fallbackRepoTotals?.totalAdditions ?? 0;
  const defaultDeletionCount = defaultBranchTotals?.totalDeletions ?? fallbackRepoTotals?.totalDeletions ?? 0;
  const allCommitCount = allBranchesTotals?.totalCommits ?? defaultCommitCount;
  const allAdditionCount = allBranchesTotals?.totalAdditions ?? defaultAdditionCount;
  const allDeletionCount = allBranchesTotals?.totalDeletions ?? defaultDeletionCount;

  const canRemove = !readOnly && typeof onRemoveLink === "function";

  return (
    <div key={link.id} className="github-repo-link-card">
      <div className="github-repo-link-card__header">
        <div>
          <p className="github-repo-link-card__title">{link.repository.fullName}</p>
          <div className="github-repo-link-card__meta-row">
            <span className="github-repo-link-card__chip">{link.repository.isPrivate ? "Private repository" : "Public repository"}</span>
            <span className="github-repo-link-card__chip">Default branch {link.repository.defaultBranch || "unknown"}</span>
            <span className="github-repo-link-card__chip">Analysed {analysedLabel}</span>
          </div>
        </div>
      </div>

      <section className="github-repo-link-card__overview" aria-label="Repository overview">
        <p className="github-repo-link-card__section-label">Overview</p>
        <div className="github-repo-link-card__stats">
          <div className="github-repo-link-card__stat">
            <div className="github-repo-link-card__stat-label">Default branch commits</div>
            <div className="github-repo-link-card__stat-value">{defaultCommitCount}</div>
          </div>
          <div className="github-repo-link-card__stat">
            <div className="github-repo-link-card__stat-label">Default additions / deletions</div>
            <div className="github-repo-link-card__stat-value">
              {defaultAdditionCount} <span className="github-repo-link-card__stat-subtle">/ {defaultDeletionCount}</span>
            </div>
          </div>
          <div className="github-repo-link-card__stat">
            <div className="github-repo-link-card__stat-label">All-branches commits</div>
            <div className="github-repo-link-card__stat-value">{allCommitCount}</div>
          </div>
          <div className="github-repo-link-card__stat">
            <div className="github-repo-link-card__stat-label">All additions / deletions</div>
            <div className="github-repo-link-card__stat-value">
              {allAdditionCount} <span className="github-repo-link-card__stat-subtle">/ {allDeletionCount}</span>
            </div>
          </div>
        </div>
      </section>
      <GithubRepoChartsDashboard
        snapshot={snapshot}
        coverage={coverage}
        currentGithubLogin={currentGithubLogin}
        viewerMode={viewerMode}
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
    </div>
  );
}
