"use client";

import type React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  chartWrap: {
    marginTop: 10,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--surface)",
  } as React.CSSProperties,
  chartSection: {
    marginTop: 12,
    paddingTop: 4,
    borderTop: "1px solid var(--border)",
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

function buildCommitShareSeries(
  snapshot: GithubLatestSnapshot["snapshot"] | null | undefined,
  currentGithubLogin: string | null
) {
  const totalCommits = Number(snapshot?.repoStats?.[0]?.totalCommits ?? 0);
  if (!totalCommits || !currentGithubLogin || !snapshot?.userStats?.length) {
    return [];
  }

  const normalizedLogin = currentGithubLogin.trim().toLowerCase();
  const personalStat = snapshot.userStats.find(
    (stat) => stat.githubLogin?.trim().toLowerCase() === normalizedLogin
  );
  const personalCommits = Math.max(0, Number(personalStat?.commits ?? 0));
  const restCommits = Math.max(0, totalCommits - personalCommits);

  if (personalCommits === 0 && restCommits === 0) {
    return [];
  }

  return [
    { name: "Your commits", value: personalCommits, fill: "var(--accent-warm)" },
    { name: "Rest", value: restCommits, fill: "var(--border-strong, #9ca3af)" },
  ];
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
  const commitShareSeries = buildCommitShareSeries(snapshot, currentGithubLogin);
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
      {chartSeries.length > 0 || lineChangeComparisonSeries.length > 0 || commitShareSeries.length > 0 ? (
        <section style={styles.chartSection} aria-label="Repository charts">
          <p className="muted" style={{ marginTop: 2, marginBottom: 4 }}>Charts</p>
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
          {commitShareSeries.length > 0 ? (
            <div style={styles.chartWrap}>
              <p className="muted" style={{ marginBottom: 6 }}>Commit share (you vs rest)</p>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={commitShareSeries}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {commitShareSeries.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </section>
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
