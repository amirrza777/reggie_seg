"use client";

import type React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  currentGithubLogin: string | null;
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

function getPersonalCommitsByDay(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined, currentGithubLogin: string | null) {
  const normalizedLogin = currentGithubLogin?.trim().toLowerCase();
  if (!normalizedLogin || !snapshot?.userStats?.length) {
    return {};
  }

  const personalStat = snapshot.userStats.find(
    (stat) => stat.githubLogin?.trim().toLowerCase() === normalizedLogin
  );
  const commitsByDay = personalStat?.commitsByDay;
  if (!commitsByDay || typeof commitsByDay !== "object") {
    return {};
  }

  return commitsByDay;
}

function buildChartSeries(
  totalSeries: Array<{ date: string; commits: number }>,
  personalByDay: Record<string, number>
) {
  return totalSeries.map((item) => ({
    date: item.date,
    commits: item.commits,
    personalCommits: Number(personalByDay[item.date]) || 0,
  }));
}

function buildLineChangeComparisonSeries(snapshot: GithubLatestSnapshot["snapshot"] | null | undefined) {
  const defaultBranch = snapshot?.data?.branchScopeStats?.defaultBranch;
  const allBranches = snapshot?.data?.branchScopeStats?.allBranches;
  const rows: Array<{ scope: string; additions: number; deletions: number }> = [];

  if (defaultBranch) {
    rows.push({
      scope: "Default",
      additions: Number(defaultBranch.totalAdditions) || 0,
      deletions: Number(defaultBranch.totalDeletions) || 0,
    });
  }

  if (allBranches) {
    rows.push({
      scope: "All branches",
      additions: Number(allBranches.totalAdditions) || 0,
      deletions: Number(allBranches.totalDeletions) || 0,
    });
  }

  return rows;
}

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
  const commitsByDaySeries = getCommitsByDaySeries(snapshot);
  const personalByDay = getPersonalCommitsByDay(snapshot, currentGithubLogin);
  const chartSeries = buildChartSeries(commitsByDaySeries, personalByDay);
  const lineChangeComparisonSeries = buildLineChangeComparisonSeries(snapshot);

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
      {chartSeries.length > 0 ? (
        <div style={styles.chartWrap}>
          <p className="muted" style={{ marginBottom: 6 }}>Commits over time (total vs your commits)</p>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
                  name="Total commits"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="personalCommits"
                  name="Your commits"
                  stroke="var(--accent-warm)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
      {lineChangeComparisonSeries.length > 0 ? (
        <div style={styles.chartWrap}>
          <p className="muted" style={{ marginBottom: 6 }}>Line changes comparison (default vs all branches)</p>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineChangeComparisonSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="scope" tick={{ fill: "var(--muted)" }} />
                <YAxis tick={{ fill: "var(--muted)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="additions" name="Additions" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="deletions" name="Deletions" fill="var(--accent-warm)" radius={[6, 6, 0, 0]} />
              </BarChart>
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
