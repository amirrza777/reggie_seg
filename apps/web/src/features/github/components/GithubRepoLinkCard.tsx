"use client";

import type React from "react";
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
  busy: boolean;
  loading: boolean;
  removingLinkId: number | null;
  onRemoveLink: (linkId: number) => void;
};

const styles = {
  listItem: {
    padding: "14px",
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--glass-surface)",
    marginBottom: 8,
  } as React.CSSProperties,
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,
  repoTitle: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.15,
    margin: 0,
  } as React.CSSProperties,
  metaRow: {
    marginTop: 8,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,
  metaChip: {
    border: "1px solid var(--border)",
    borderRadius: 999,
    padding: "4px 10px",
    background: "var(--surface)",
    color: "var(--muted)",
    fontSize: 12,
  } as React.CSSProperties,
  statGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  } as React.CSSProperties,
  statCard: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)",
    padding: 10,
  } as React.CSSProperties,
  statLabel: {
    color: "var(--muted)",
    fontSize: 12,
    marginBottom: 4,
  } as React.CSSProperties,
  statValue: {
    fontWeight: 700,
    fontSize: 18,
    lineHeight: 1.1,
  } as React.CSSProperties,
  actions: {
    marginTop: 8,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,
  overviewSection: {
    marginTop: 12,
    paddingTop: 4,
    borderTop: "1px solid var(--border)",
  } as React.CSSProperties,
  sectionLabel: {
    marginTop: 2,
    marginBottom: 4,
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  } as React.CSSProperties,
};

export function GithubRepoLinkCard({
  link,
  coverage,
  snapshot,
  currentGithubLogin,
  busy,
  loading,
  removingLinkId,
  onRemoveLink,
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

  return (
    <div key={link.id} style={styles.listItem}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.repoTitle}>{link.repository.fullName}</p>
          <div style={styles.metaRow}>
            <span style={styles.metaChip}>{link.repository.isPrivate ? "Private repository" : "Public repository"}</span>
            <span style={styles.metaChip}>Default branch {link.repository.defaultBranch || "unknown"}</span>
            <span style={styles.metaChip}>Analysed {analysedLabel}</span>
          </div>
        </div>
      </div>

      <section style={styles.overviewSection} aria-label="Repository overview">
        <p style={styles.sectionLabel}>Overview</p>
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Default branch commits</div>
            <div style={styles.statValue}>{defaultCommitCount}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Default additions / deletions</div>
            <div style={styles.statValue}>
              {defaultAdditionCount} <span style={{ color: "var(--muted)", fontWeight: 500 }}>/ {defaultDeletionCount}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>All-branches commits</div>
            <div style={styles.statValue}>{allCommitCount}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>All additions / deletions</div>
            <div style={styles.statValue}>
              {allAdditionCount} <span style={{ color: "var(--muted)", fontWeight: 500 }}>/ {allDeletionCount}</span>
            </div>
          </div>
        </div>
      </section>
      <GithubRepoChartsDashboard snapshot={snapshot} coverage={coverage} currentGithubLogin={currentGithubLogin} />
      <div style={styles.actions}>
        <Button
          variant="ghost"
          onClick={() => onRemoveLink(link.id)}
          disabled={busy || loading || removingLinkId === link.id}
        >
          {removingLinkId === link.id ? "Removing..." : "Remove link"}
        </Button>
      </div>
    </div>
  );
}
