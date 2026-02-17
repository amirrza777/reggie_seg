"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  disconnectGithubAccount,
  getGithubConnectionStatus,
  getLatestProjectGithubSnapshot,
  getGithubOAuthConnectUrl,
  getProjectGithubMappingCoverage,
  linkGithubRepositoryToProject,
  listGithubRepositories,
  listProjectGithubRepoLinks,
  removeProjectGithubRepoLink,
} from "../api/client";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubMappingCoverage,
  GithubRepositoryOption,
  ProjectGithubRepoLink,
} from "../types";

type GithubProjectReposClientProps = {
  projectId: string;
};

const styles = {
  panel: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
    padding: 16,
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  } as React.CSSProperties,
  list: { marginTop: 10 } as React.CSSProperties,
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
  select: {
    width: "100%",
    minHeight: 40,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 10px",
    background: "var(--surface)",
    color: "var(--ink)",
  } as React.CSSProperties,
  chartWrap: {
    marginTop: 10,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--surface)",
  } as React.CSSProperties,
};

export function GithubProjectReposClient({ projectId }: GithubProjectReposClientProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [connection, setConnection] = useState<GithubConnectionStatus | null>(null);
  const [links, setLinks] = useState<ProjectGithubRepoLink[]>([]);
  const [coverageByLinkId, setCoverageByLinkId] = useState<Record<number, GithubMappingCoverage | null>>({});
  const [latestSnapshotByLinkId, setLatestSnapshotByLinkId] = useState<Record<number, GithubLatestSnapshot["snapshot"] | null>>({});
  const [removingLinkId, setRemovingLinkId] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<GithubRepositoryOption[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");

  const numericProjectId = Number(projectId);

  async function load() {
    if (Number.isNaN(numericProjectId)) {
      setError("Invalid project id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const [status, repoLinks] = await Promise.all([
        getGithubConnectionStatus(),
        listProjectGithubRepoLinks(numericProjectId),
      ]);
      setConnection(status);
      setLinks(repoLinks);
      if (status.connected) {
        const repos = await listGithubRepositories();
        setAvailableRepos(repos);
        if (!selectedRepoId && repos.length > 0) {
          setSelectedRepoId(String(repos[0]?.githubRepoId || ""));
        }
      } else {
        setAvailableRepos([]);
        setSelectedRepoId("");
      }
      if (repoLinks.length > 0) {
        const [coverageEntries, snapshotEntries] = await Promise.all([
          Promise.all(
            repoLinks.map(async (link) => {
              try {
                const coverage = await getProjectGithubMappingCoverage(link.id);
                return [link.id, coverage] as const;
              } catch {
                return [link.id, null] as const;
              }
            })
          ),
          Promise.all(
            repoLinks.map(async (link) => {
              try {
                const latestSnapshot = await getLatestProjectGithubSnapshot(link.id);
                return [link.id, latestSnapshot.snapshot] as const;
              } catch {
                return [link.id, null] as const;
              }
            })
          ),
        ]);
        setCoverageByLinkId(Object.fromEntries(coverageEntries));
        setLatestSnapshotByLinkId(Object.fromEntries(snapshotEntries));
      } else {
        setCoverageByLinkId({});
        setLatestSnapshotByLinkId({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GitHub data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    const githubStatus = url.searchParams.get("github");
    const reason = url.searchParams.get("reason");
    if (!githubStatus) {
      return;
    }

    if (githubStatus === "connected") {
      setInfo("GitHub account connected successfully.");
      setError(null);
      void load();
    } else if (githubStatus === "error") {
      setError(reason ? `GitHub connection failed: ${reason}` : "GitHub connection failed.");
    }

    url.searchParams.delete("github");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const { url } = await getGithubOAuthConnectUrl(returnTo);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start GitHub connect flow.");
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectGithubAccount();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect GitHub.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkSelectedRepo() {
    if (Number.isNaN(numericProjectId)) return;
    const chosen = availableRepos.find((repo) => String(repo.githubRepoId) === selectedRepoId);
    if (!chosen) {
      setError("Select a repository to link.");
      return;
    }

    setLinking(true);
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await linkGithubRepositoryToProject({
        projectId: numericProjectId,
        githubRepoId: chosen.githubRepoId,
        name: chosen.name,
        fullName: chosen.fullName,
        htmlUrl: chosen.htmlUrl,
        isPrivate: chosen.isPrivate,
        ownerLogin: chosen.ownerLogin || chosen.fullName.split("/")[0] || "unknown",
        defaultBranch: chosen.defaultBranch,
      });
      setInfo(`Linked ${chosen.fullName} to this project.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link repository.");
    } finally {
      setBusy(false);
      setLinking(false);
    }
  }

  async function handleRemoveLink(linkId: number) {
    setRemovingLinkId(linkId);
    setError(null);
    setInfo(null);
    try {
      await removeProjectGithubRepoLink(linkId);
      setInfo("Removed linked repository from this project.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove linked repository.");
    } finally {
      setRemovingLinkId(null);
    }
  }

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

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section style={styles.panel}>
        <div style={styles.row}>
          <div className="stack" style={{ gap: 4 }}>
            <strong>GitHub account</strong>
            {loading ? (
              <p className="muted">Loading connection...</p>
            ) : connection?.connected ? (
              <p className="muted">Connected as @{connection.account?.login}</p>
            ) : (
              <p className="muted">No GitHub account connected.</p>
            )}
          </div>
          {connection?.connected ? (
            <Button variant="ghost" onClick={handleDisconnect} disabled={busy || loading}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={busy || loading}>
              Connect GitHub
            </Button>
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.row}>
          <strong>Linked repositories</strong>
          <Button variant="ghost" onClick={() => void load()} disabled={loading || busy}>
            Refresh
          </Button>
        </div>
        <div style={styles.list}>
          {connection?.connected && links.length === 0 ? (
            <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
              <label className="muted" htmlFor="github-repo-select">
                Select repository to link
              </label>
              <select
                id="github-repo-select"
                style={styles.select}
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                disabled={loading || busy || availableRepos.length === 0}
              >
                {availableRepos.length === 0 ? (
                  <option value="">No accessible repositories found</option>
                ) : null}
                {availableRepos.map((repo) => (
                  <option key={repo.githubRepoId} value={String(repo.githubRepoId)}>
                    {repo.fullName} {repo.isPrivate ? "(private)" : "(public)"}
                  </option>
                ))}
              </select>
              <div>
                <Button
                  onClick={handleLinkSelectedRepo}
                  disabled={loading || busy || linking || !selectedRepoId || availableRepos.length === 0}
                >
                  {linking ? "Linking and analysing..." : "Link selected repository"}
                </Button>
              </div>
            </div>
          ) : null}
          {connection?.connected && links.length > 0 ? (
            <p className="muted">This project already has a linked repository. Remove it before linking another one.</p>
          ) : null}
          {loading ? <p className="muted">Loading repositories...</p> : null}
          {!loading && links.length === 0 ? <p className="muted">No repositories linked to this project yet.</p> : null}
          {!loading &&
            links.map((link) => {
              const snapshot = latestSnapshotByLinkId[link.id];
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
                  {coverageByLinkId[link.id]?.analysedAt ? (
                    <p className="muted">
                      Last analysed {new Date(String(coverageByLinkId[link.id]?.analysedAt)).toLocaleString()} • Total commits{" "}
                      {coverageByLinkId[link.id]?.coverage?.totalCommits ?? 0}
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
                      onClick={() => void handleRemoveLink(link.id)}
                      disabled={busy || loading || removingLinkId === link.id}
                    >
                      {removingLinkId === link.id ? "Removing..." : "Remove link"}
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {info ? <p className="muted">{info}</p> : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}
