"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import { GithubProjectReposHero } from "./GithubProjectReposHero";
import {
  analyseProjectGithubRepo,
  disconnectGithubAccount,
  getGithubConnectUrl,
  getGithubConnectionStatus,
  getLatestProjectGithubSnapshot,
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
  const tabs = [
    { key: "graphs", label: "Graphs" },
    { key: "commits", label: "Commits" },
    { key: "stats", label: "Stats" },
    { key: "configurations", label: "Configurations" },
  ] as const;

  type TabKey = (typeof tabs)[number]["key"];

  const githubAppInstallUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL?.trim() || "";
  console.log("Using GitHub App install URL:", githubAppInstallUrl);
  const [activeTab, setActiveTab] = useState<TabKey>("configurations");
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
  const activeLinkCount = links.filter((link) => link.isActive).length;
  const needsGithubAppInstall =
    connection?.connected &&
    typeof error === "string" &&
    error.toLowerCase().includes("not installed on any account or organization");

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
      const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      const { url } = await getGithubConnectUrl(returnTo);
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

  function handleOpenGithubAppInstall() {
    if (!githubAppInstallUrl) {
      setError("GitHub App install URL is not configured.");
      return;
    }
    window.open(githubAppInstallUrl, "_blank", "noopener,noreferrer");
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

  async function handleRefreshSnapshots() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (links.length > 0) {
        await Promise.all(links.map((link) => analyseProjectGithubRepo(link.id)));
        setInfo("Repository snapshot refreshed.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh repository snapshot.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack" style={{ gap: 16 }}>
      <GithubProjectReposHero
        connectedLogin={connection?.account?.login ?? null}
        accessibleRepoCount={availableRepos.length}
        linkedRepoCount={activeLinkCount}
        loading={loading}
      />
      <section style={{ ...styles.panel, padding: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </section>

      {activeTab === "graphs" ? (
        <section style={styles.panel}>
          <strong>Graphs</strong>
          <p className="muted" style={styles.list}>
            Graphs view coming soon.
          </p>
        </section>
      ) : null}

      {activeTab === "commits" ? (
        <section style={styles.panel}>
          <strong>Commits</strong>
          <p className="muted" style={styles.list}>
            Commits view coming soon.
          </p>
        </section>
      ) : null}

      {activeTab === "stats" ? (
        <section style={styles.panel}>
          <strong>Stats</strong>
          <p className="muted" style={styles.list}>
            Stats view coming soon.
          </p>
        </section>
      ) : null}

      {activeTab === "configurations" ? (
        <>
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {needsGithubAppInstall ? (
                    <Button variant="ghost" onClick={handleOpenGithubAppInstall} disabled={busy || loading}>
                      Install GitHub App
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={handleDisconnect} disabled={busy || loading}>
                    Disconnect
                  </Button>
                </div>
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
              <Button variant="ghost" onClick={handleRefreshSnapshots} disabled={loading || busy}>
                {busy && links.length > 0 ? "Refreshing..." : "Refresh"}
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
              {connection?.connected && links.length > 0 ? <p className="muted">This project already has a linked repository. Remove it before linking another one.</p> : null}
              {loading ? <p className="muted">Loading repositories...</p> : null}
              {!loading && links.length === 0 ? <p className="muted">No repositories linked to this project yet.</p> : null}
              {!loading &&
                links.map((link) => (
                  <GithubRepoLinkCard
                    key={link.id}
                    link={link}
                    coverage={coverageByLinkId[link.id] ?? null}
                    snapshot={latestSnapshotByLinkId[link.id] ?? null}
                    currentGithubLogin={connection?.account?.login ?? null}
                    busy={busy}
                    loading={loading}
                    removingLinkId={removingLinkId}
                    onRemoveLink={(linkId) => void handleRemoveLink(linkId)}
                  />
                ))}
            </div>
          </section>
        </>
      ) : null}

      {info ? <p className="muted">{info}</p> : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}
