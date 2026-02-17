"use client";

import type React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/shared/ui/Button";
import type {
  GithubLatestSnapshot,
  GithubMappingCoverage,
  ProjectGithubRepoLink,
} from "../types";

type GithubRepoLinkCardProps = {
  link: ProjectGithubRepoLink;
  coverage: GithubMappingCoverage | null;
  snapshot: GithubLatestSnapshot["snapshot"] | null;
  busy: boolean;
  loading: boolean;
  removingLinkId: number | null;
  onRemoveLink: (linkId: number) => void;
};

const styles = {
  listItem: {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--glass-surface)",
    marginBottom: 8,
  } as React.CSSProperties,
  actions: {
    marginTop: 8,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,
  chartWrap: {
    marginTop: 10,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--surface)",
  } as React.CSSProperties,
};

function getCommitsByDaySeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const commitsByDay = snapshot?.repoStats?.[0]?.commitsByDay;
  if (!commitsByDay || typeof commitsByDay !== "object") {
    return [];
  }
  return Object.entries(commitsByDay)
    .map(([date, commits]) => ({
      date,
      commits: Number(commits) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function GithubRepoLinkCard({
  link,
  coverage,
  snapshot,
  busy,
  loading,
  removingLinkId,
  onRemoveLink,
}: GithubRepoLinkCardProps) {
  const defaultBranchTotals = snapshot?.data?.branchScopeStats?.defaultBranch;
  const allBranchesTotals = snapshot?.data?.branchScopeStats?.allBranches;
  const fallbackRepoTotals = snapshot?.repoStats?.[0] ?? null;
  const commitsByDaySeries = getCommitsByDaySeries(snapshot);

  return (
    <div key={link.id} style={styles.listItem}>
      <strong>{link.repository.fullName}</strong>
      <p className="muted">
        {link.repository.isPrivate ? "Private" : "Public"} • default branch {link.repository.defaultBranch || "unknown"}
      </p>
      {coverage?.analysedAt ? (
        <p className="muted">
          Last analysed {new Date(String(coverage.analysedAt)).toLocaleString()} • Total commits {coverage.coverage?.totalCommits ?? 0}
        </p>
      ) : (
        <p className="muted">No snapshot analysed yet.</p>
      )}
      {defaultBranchTotals ? (
        <p className="muted">
          Default branch ({defaultBranchTotals.branch}) • commits {defaultBranchTotals.totalCommits} • additions{" "}
          {defaultBranchTotals.totalAdditions} • deletions {defaultBranchTotals.totalDeletions}
        </p>
      ) : fallbackRepoTotals ? (
        <p className="muted">
          Default branch • commits {fallbackRepoTotals.totalCommits} • additions {fallbackRepoTotals.totalAdditions} •
          {" "}deletions {fallbackRepoTotals.totalDeletions}
        </p>
      ) : null}
      {allBranchesTotals ? (
        <p className="muted">
          All branches ({allBranchesTotals.branchCount}) • commits {allBranchesTotals.totalCommits} • additions{" "}
          {allBranchesTotals.totalAdditions} • deletions {allBranchesTotals.totalDeletions}
        </p>
      ) : null}
      {commitsByDaySeries.length > 0 ? (
        <div style={styles.chartWrap}>
          <p className="muted" style={{ marginBottom: 6 }}>Commits over time</p>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={commitsByDaySeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)" }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="commits"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
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

