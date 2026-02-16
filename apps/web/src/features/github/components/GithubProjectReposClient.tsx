"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import {
  analyseProjectGithubRepo,
  disconnectGithubAccount,
  getGithubConnectionStatus,
  getGithubOAuthConnectUrl,
  getProjectGithubMappingCoverage,
  linkGithubRepositoryToProject,
  listGithubRepositories,
  listProjectGithubRepoLinks,
} from "../api/client";
import type {
  GithubConnectionStatus,
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
};

export function GithubProjectReposClient({ projectId }: GithubProjectReposClientProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [connection, setConnection] = useState<GithubConnectionStatus | null>(null);
  const [links, setLinks] = useState<ProjectGithubRepoLink[]>([]);
  const [coverageByLinkId, setCoverageByLinkId] = useState<Record<number, GithubMappingCoverage | null>>({});
  const [analysingLinkId, setAnalysingLinkId] = useState<number | null>(null);
  const [loadingCoverageLinkId, setLoadingCoverageLinkId] = useState<number | null>(null);
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
        const coverageEntries = await Promise.all(
          repoLinks.map(async (link) => {
            try {
              const coverage = await getProjectGithubMappingCoverage(link.id);
              return [link.id, coverage] as const;
            } catch {
              return [link.id, null] as const;
            }
          })
        );
        setCoverageByLinkId(Object.fromEntries(coverageEntries));
      } else {
        setCoverageByLinkId({});
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

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await getGithubOAuthConnectUrl();
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
    }
  }

  async function handleAnalyseNow(linkId: number) {
    setAnalysingLinkId(linkId);
    setError(null);
    setInfo(null);
    try {
      await analyseProjectGithubRepo(linkId);
      const latestCoverage = await getProjectGithubMappingCoverage(linkId);
      setCoverageByLinkId((prev) => ({ ...prev, [linkId]: latestCoverage }));
      setInfo("Analysis complete.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyse linked repository.");
    } finally {
      setAnalysingLinkId(null);
    }
  }

  async function handleLoadCoverage(linkId: number) {
    setLoadingCoverageLinkId(linkId);
    setError(null);
    try {
      const latestCoverage = await getProjectGithubMappingCoverage(linkId);
      setCoverageByLinkId((prev) => ({ ...prev, [linkId]: latestCoverage }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coverage.");
    } finally {
      setLoadingCoverageLinkId(null);
    }
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
          {connection?.connected ? (
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
                  disabled={loading || busy || !selectedRepoId || availableRepos.length === 0}
                >
                  Link selected repository
                </Button>
              </div>
            </div>
          ) : null}
          {loading ? <p className="muted">Loading repositories...</p> : null}
          {!loading && links.length === 0 ? <p className="muted">No repositories linked to this project yet.</p> : null}
          {!loading &&
            links.map((link) => (
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
                <div style={styles.actions}>
                  <Button
                    onClick={() => void handleAnalyseNow(link.id)}
                    disabled={busy || loading || analysingLinkId === link.id}
                  >
                    {analysingLinkId === link.id ? "Analysing..." : "Analyse now"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void handleLoadCoverage(link.id)}
                    disabled={busy || loading || loadingCoverageLinkId === link.id}
                  >
                    {loadingCoverageLinkId === link.id ? "Loading..." : "Load coverage"}
                  </Button>
                </div>
                {coverageByLinkId[link.id]?.coverage ? (
                  <p className="muted">
                    Matched {coverageByLinkId[link.id]?.coverage?.matchedContributors}/
                    {coverageByLinkId[link.id]?.coverage?.totalContributors} contributors • Unmatched commits{" "}
                    {coverageByLinkId[link.id]?.coverage?.unmatchedCommits}/
                    {coverageByLinkId[link.id]?.coverage?.totalCommits}
                  </p>
                ) : null}
              </div>
            ))}
        </div>
      </section>

      {info ? <p className="muted">{info}</p> : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}
