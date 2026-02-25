"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Table } from "@/shared/ui/Table";
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
  listLiveProjectGithubRepoBranchCommits,
  listLiveProjectGithubRepoBranches,
  listLiveProjectGithubRepoMyCommits,
  listGithubRepositories,
  listProjectGithubRepoLinks,
  removeProjectGithubRepoLink,
} from "../api/client";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubLiveProjectRepoMyCommits,
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
  tabBarPanel: {
    ...({
      border: "1px solid var(--border)",
      borderRadius: 14,
      background:
        "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, var(--accent) 8%), var(--surface))",
      padding: 10,
      boxShadow: "var(--shadow-sm)",
    } as React.CSSProperties),
  } as React.CSSProperties,
  tabRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,
  tabButton: {
    borderRadius: 10,
    minHeight: 38,
    paddingInline: 12,
  } as React.CSSProperties,
  tabButtonActive: {
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
  } as React.CSSProperties,
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  } as React.CSSProperties,
  sectionTitleWrap: {
    display: "grid",
    gap: 2,
  } as React.CSSProperties,
  sectionKicker: {
    margin: 0,
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  } as React.CSSProperties,
  statusBanner: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "10px 12px",
    background: "var(--surface)",
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  statusInfo: {
    borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
    background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
  } as React.CSSProperties,
  statusError: {
    borderColor: "color-mix(in srgb, #ef4444 35%, var(--border))",
    background: "color-mix(in srgb, #ef4444 8%, var(--surface))",
  } as React.CSSProperties,
};

export function GithubProjectReposClient({ projectId }: GithubProjectReposClientProps) {
  const tabs = [
    { key: "repositories", label: "Repositories" },
    { key: "my-commits", label: "My commits" },
    { key: "branches", label: "Branches" },
    { key: "configurations", label: "Configurations" },
  ] as const;

  type TabKey = (typeof tabs)[number]["key"];

  const githubAppInstallUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL?.trim() || "";
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [connection, setConnection] = useState<GithubConnectionStatus | null>(null);
  const [links, setLinks] = useState<ProjectGithubRepoLink[]>([]);
  const [coverageByLinkId, setCoverageByLinkId] = useState<Record<number, GithubMappingCoverage | null>>({});
  const [latestSnapshotByLinkId, setLatestSnapshotByLinkId] = useState<Record<number, GithubLatestSnapshot["snapshot"] | null>>({});
  const [liveBranchesByLinkId, setLiveBranchesByLinkId] = useState<Record<number, GithubLiveProjectRepoBranches | null>>({});
  const [liveBranchesLoadingByLinkId, setLiveBranchesLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [liveBranchesErrorByLinkId, setLiveBranchesErrorByLinkId] = useState<Record<number, string | null>>({});
  const [liveBranchesRefreshing, setLiveBranchesRefreshing] = useState(false);
  const [selectedBranchByLinkId, setSelectedBranchByLinkId] = useState<Record<number, string>>({});
  const [branchCommitsByLinkId, setBranchCommitsByLinkId] = useState<Record<number, GithubLiveProjectRepoBranchCommits | null>>({});
  const [branchCommitsLoadingByLinkId, setBranchCommitsLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [branchCommitsErrorByLinkId, setBranchCommitsErrorByLinkId] = useState<Record<number, string | null>>({});
  const [myCommitsByLinkId, setMyCommitsByLinkId] = useState<Record<number, GithubLiveProjectRepoMyCommits | null>>({});
  const [myCommitsLoadingByLinkId, setMyCommitsLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [myCommitsErrorByLinkId, setMyCommitsErrorByLinkId] = useState<Record<number, string | null>>({});
  const [removingLinkId, setRemovingLinkId] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<GithubRepositoryOption[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const didAutoSelectInitialTabRef = useRef(false);

  const numericProjectId = Number(projectId);
  const activeLinkCount = links.filter((link) => link.isActive).length;
  const needsGithubAppInstall =
    connection?.connected &&
    typeof error === "string" &&
    error.toLowerCase().includes("not installed on any account or organization");

  function buildBranchRows(link: ProjectGithubRepoLink) {
    const snapshot = latestSnapshotByLinkId[link.id];
    const commitsByBranch = snapshot?.data?.branchScopeStats?.allBranches?.commitsByBranch || {};
    const liveBranchData = liveBranchesByLinkId[link.id];

    if (!liveBranchData?.branches?.length) {
      return null;
    }

    return liveBranchData.branches.map((branch) => [
      branch.name,
      branch.isDefault ? "Yes" : "No",
      typeof commitsByBranch[branch.name] === "number" ? Number(commitsByBranch[branch.name]) : "-",
      branch.aheadBy ?? "-",
      branch.behindBy ?? "-",
      branch.compareStatus ?? "-",
    ]);
  }

  async function fetchLiveBranchesForLinks(linkIds: number[], options?: { force?: boolean }) {
    if (linkIds.length === 0) {
      return;
    }

    const idsToFetch = options?.force
      ? linkIds
      : linkIds.filter((linkId) => liveBranchesByLinkId[linkId] === undefined && !liveBranchesLoadingByLinkId[linkId]);

    if (idsToFetch.length === 0) {
      return;
    }

    setLiveBranchesRefreshing(true);
    setLiveBranchesLoadingByLinkId((prev) => {
      const next = { ...prev };
      for (const id of idsToFetch) next[id] = true;
      return next;
    });
    setLiveBranchesErrorByLinkId((prev) => {
      const next = { ...prev };
      for (const id of idsToFetch) next[id] = null;
      return next;
    });

    await Promise.all(
      idsToFetch.map(async (linkId) => {
        try {
          const data = await listLiveProjectGithubRepoBranches(linkId);
          setLiveBranchesByLinkId((prev) => ({ ...prev, [linkId]: data }));
          setSelectedBranchByLinkId((prev) => {
            if (prev[linkId]) {
              return prev;
            }
            const defaultBranch = data.branches.find((branch) => branch.isDefault)?.name || data.branches[0]?.name || "";
            return defaultBranch ? { ...prev, [linkId]: defaultBranch } : prev;
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to load live branches.";
          setLiveBranchesErrorByLinkId((prev) => ({ ...prev, [linkId]: message }));
        } finally {
          setLiveBranchesLoadingByLinkId((prev) => ({ ...prev, [linkId]: false }));
        }
      })
    );

    setLiveBranchesRefreshing(false);
  }

  async function handleRefreshLiveBranches() {
    await fetchLiveBranchesForLinks(
      links.map((link) => link.id),
      { force: true }
    );
  }

  async function fetchBranchCommits(linkId: number, branchName: string) {
    if (!branchName) {
      return;
    }
    setBranchCommitsLoadingByLinkId((prev) => ({ ...prev, [linkId]: true }));
    setBranchCommitsErrorByLinkId((prev) => ({ ...prev, [linkId]: null }));
    try {
      const data = await listLiveProjectGithubRepoBranchCommits(linkId, branchName, 10);
      setBranchCommitsByLinkId((prev) => ({ ...prev, [linkId]: data }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load branch commits.";
      setBranchCommitsErrorByLinkId((prev) => ({ ...prev, [linkId]: message }));
    } finally {
      setBranchCommitsLoadingByLinkId((prev) => ({ ...prev, [linkId]: false }));
    }
  }

  async function fetchMyCommits(linkId: number, page = 1, options?: { includeTotals?: boolean }) {
    setMyCommitsLoadingByLinkId((prev) => ({ ...prev, [linkId]: true }));
    setMyCommitsErrorByLinkId((prev) => ({ ...prev, [linkId]: null }));
    try {
      const previousData = myCommitsByLinkId[linkId];
      const shouldIncludeTotals =
        typeof options?.includeTotals === "boolean" ? options.includeTotals : page === 1 || !previousData?.totals;
      const data = await listLiveProjectGithubRepoMyCommits(linkId, page, 10, {
        includeTotals: shouldIncludeTotals,
      });
      setMyCommitsByLinkId((prev) => ({
        ...prev,
        [linkId]: {
          ...data,
          totals: data.totals ?? prev[linkId]?.totals ?? null,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load your commits.";
      setMyCommitsErrorByLinkId((prev) => ({ ...prev, [linkId]: message }));
    } finally {
      setMyCommitsLoadingByLinkId((prev) => ({ ...prev, [linkId]: false }));
    }
  }

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
    didAutoSelectInitialTabRef.current = false;
    setActiveTab(null);
  }, [projectId]);

  useEffect(() => {
    if (loading || didAutoSelectInitialTabRef.current) {
      return;
    }

    const shouldOpenConfigurations = !connection?.connected || needsGithubAppInstall;
    setActiveTab(shouldOpenConfigurations ? "configurations" : "repositories");
    didAutoSelectInitialTabRef.current = true;
  }, [loading, connection?.connected, needsGithubAppInstall]);

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

  useEffect(() => {
    if (activeTab !== "branches" || loading || links.length === 0) {
      return;
    }
    void fetchLiveBranchesForLinks(links.map((link) => link.id));
  }, [activeTab, loading, links]);

  useEffect(() => {
    if (activeTab !== "branches" || loading || links.length === 0) {
      return;
    }
    for (const link of links) {
      const selectedBranch = selectedBranchByLinkId[link.id];
      if (!selectedBranch) {
        continue;
      }
      const currentCommitData = branchCommitsByLinkId[link.id];
      if (currentCommitData?.branch === selectedBranch) {
        continue;
      }
      if (branchCommitsLoadingByLinkId[link.id]) {
        continue;
      }
      void fetchBranchCommits(link.id, selectedBranch);
    }
  }, [activeTab, loading, links, selectedBranchByLinkId]);

  useEffect(() => {
    if (activeTab !== "my-commits" || loading || links.length === 0 || !connection?.connected) {
      return;
    }

    for (const link of links) {
      if (myCommitsLoadingByLinkId[link.id]) {
        continue;
      }
      const existing = myCommitsByLinkId[link.id];
      if (!existing) {
        void fetchMyCommits(link.id, 1);
        continue;
      }
      if (!existing.totals) {
        void fetchMyCommits(link.id, 1, { includeTotals: true });
      }
    }
  }, [activeTab, loading, links, connection?.connected]);

  useEffect(() => {
    if (loading || activeTab === "my-commits" || links.length === 0 || !connection?.connected) {
      return;
    }

    const timer = window.setTimeout(() => {
      for (const link of links) {
        if (myCommitsByLinkId[link.id] || myCommitsLoadingByLinkId[link.id]) {
          continue;
        }
        void fetchMyCommits(link.id, 1, { includeTotals: false });
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [loading, activeTab, links, connection?.connected]);

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
    window.location.assign(githubAppInstallUrl);
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
      {info ? (
        <div style={{ ...styles.statusBanner, ...styles.statusInfo }}>
          <p className="muted" style={{ margin: 0 }}>{info}</p>
        </div>
      ) : null}
      {error ? (
        <div style={{ ...styles.statusBanner, ...styles.statusError }}>
          <p className="muted" style={{ margin: 0 }}>{error}</p>
        </div>
      ) : null}
      <section style={styles.tabBarPanel}>
        <div style={styles.tabRow}>
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : null),
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </section>

      {activeTab === "repositories" ? (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleWrap}>
              <p style={styles.sectionKicker}>Repositories</p>
              <strong>Linked repositories</strong>
            </div>
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
      ) : null}

      {activeTab === "my-commits" ? (
        <section style={styles.panel}>
          <div style={styles.sectionTitleWrap}>
            <p style={styles.sectionKicker}>Personal activity</p>
            <strong>My commits</strong>
          </div>
          <div style={styles.list}>
            {loading ? <p className="muted">Loading commits...</p> : null}
            {!loading && !connection?.connected ? <p className="muted">Connect GitHub to view your commits.</p> : null}
            {!loading && connection?.connected && links.length === 0 ? (
              <p className="muted">Link a repository first to view your commits.</p>
            ) : null}
            {!loading &&
              connection?.connected &&
              links.map((link) => {
                const snapshot = latestSnapshotByLinkId[link.id];
                const myCommitData = myCommitsByLinkId[link.id];
                const currentPage = myCommitData?.page || 1;
                const totals = myCommitData?.totals;

                return (
                  <div key={link.id} style={{ ...styles.panel, marginTop: 12, padding: 12 }}>
                    <div style={styles.row}>
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{link.repository.fullName}</strong>
                        <p className="muted">
                          {connection?.account?.login ? `Showing commits for @${connection?.account?.login}` : "Showing your commits"}
                          {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                          gap: 8,
                          width: "100%",
                          maxWidth: 760,
                        }}
                      >
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            background: "var(--surface)",
                          }}
                        >
                          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            Commits
                          </p>
                          <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 18 }}>
                            {typeof totals?.commits === "number" ? totals.commits.toLocaleString() : "-"}
                          </p>
                        </div>
                        <div
                          style={{
                            border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
                            borderRadius: 10,
                            padding: "8px 10px",
                            background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
                          }}
                        >
                          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            Lines (no merge PRs)
                          </p>
                          <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
                            +{typeof totals?.additionsExcludingMergePullRequests === "number" ? totals.additionsExcludingMergePullRequests.toLocaleString() : "-"}{" "}
                            / -{typeof totals?.deletionsExcludingMergePullRequests === "number" ? totals.deletionsExcludingMergePullRequests.toLocaleString() : "-"}
                          </p>
                        </div>
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            background: "var(--surface)",
                          }}
                        >
                          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            With merges
                          </p>
                          <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
                            +{typeof totals?.additionsIncludingMergePullRequests === "number" ? totals.additionsIncludingMergePullRequests.toLocaleString() : "-"}{" "}
                            / -{typeof totals?.deletionsIncludingMergePullRequests === "number" ? totals.deletionsIncludingMergePullRequests.toLocaleString() : "-"}
                          </p>
                        </div>
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            background: "var(--surface)",
                          }}
                        >
                          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            Merge PR commits
                          </p>
                          <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
                            {typeof totals?.mergePullRequestCommits === "number"
                              ? totals.mergePullRequestCommits.toLocaleString()
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {totals &&
                    typeof totals.detailedCommitCount === "number" &&
                    typeof totals.requestedCommitCount === "number" &&
                    totals.detailedCommitCount < totals.requestedCommitCount ? (
                      <p className="muted" style={{ marginTop: 8 }}>
                        Line totals coverage: {totals.detailedCommitCount}/{totals.requestedCommitCount} commits
                      </p>
                    ) : null}

                    {myCommitsLoadingByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        Loading your commits...
                      </p>
                    ) : null}
                    {myCommitsErrorByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        Failed to load commits: {myCommitsErrorByLinkId[link.id]}
                      </p>
                    ) : null}

                    {myCommitData?.commits?.length ? (
                      <>
                        <div style={{ marginTop: 10 }}>
                          <Table
                            headers={["Commit", "Date", "Additions", "Deletions"]}
                            columnTemplate="minmax(0, 1.8fr) minmax(170px, 220px) minmax(90px, 110px) minmax(90px, 110px)"
                            rows={myCommitData.commits.map((commit) => [
                              <div key={commit.sha} className="stack" style={{ gap: 2 }}>
                                <a href={commit.htmlUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                                  {commit.message || "(no message)"}
                                </a>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  <span className="muted" style={{ fontSize: 12 }}>
                                    {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                                  </span>
                                  {commit.isMergePullRequest ? (
                                    <span
                                      style={{
                                        border: "1px solid var(--border)",
                                        borderRadius: 999,
                                        padding: "1px 8px",
                                        fontSize: 11,
                                        color: "var(--muted)",
                                        background: "var(--surface)",
                                      }}
                                    >
                                      Merge PR
                                    </span>
                                  ) : null}
                                </div>
                              </div>,
                              commit.date ? new Date(commit.date).toLocaleString() : "-",
                              commit.additions ?? "-",
                              commit.deletions ?? "-",
                            ])}
                          />
                        </div>
                        <div style={{ ...styles.row, marginTop: 10 }}>
                          <p className="muted">Page {currentPage}</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button
                              variant="ghost"
                              onClick={() => void fetchMyCommits(link.id, currentPage - 1)}
                              disabled={Boolean(myCommitsLoadingByLinkId[link.id]) || currentPage <= 1}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => void fetchMyCommits(link.id, currentPage + 1)}
                              disabled={Boolean(myCommitsLoadingByLinkId[link.id]) || !myCommitData.hasNextPage}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : !myCommitsLoadingByLinkId[link.id] && !myCommitsErrorByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        No commits found for your GitHub account in this repository.
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </section>
      ) : null}

      {activeTab === "branches" ? (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleWrap}>
              <p style={styles.sectionKicker}>Live repository data</p>
              <strong>Branches</strong>
            </div>
            <Button variant="ghost" onClick={() => void handleRefreshLiveBranches()} disabled={loading || liveBranchesRefreshing}>
              {liveBranchesRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div style={styles.list}>
            {loading ? <p className="muted">Loading branch data...</p> : null}
            {!loading && links.length === 0 ? <p className="muted">No linked repository available.</p> : null}
            {!loading &&
              links.map((link) => {
                const snapshot = latestSnapshotByLinkId[link.id];
                const rows = buildBranchRows(link);
                return (
                  <div key={link.id} style={{ ...styles.panel, marginTop: 12, padding: 12 }}>
                    <div style={styles.row}>
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{link.repository.fullName}</strong>
                        <p className="muted">
                          Default branch: {link.repository.defaultBranch || "unknown"}
                          {snapshot?.analysedAt ? ` • Snapshot: ${new Date(snapshot.analysedAt).toLocaleString()}` : ""}
                        </p>
                      </div>
                    </div>
                    {liveBranchesLoadingByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        Loading live branches...
                      </p>
                    ) : null}
                    {liveBranchesErrorByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        Failed to load live branches: {liveBranchesErrorByLinkId[link.id]}
                      </p>
                    ) : null}
                    {!rows && !liveBranchesLoadingByLinkId[link.id] && !liveBranchesErrorByLinkId[link.id] ? (
                      <p className="muted" style={{ marginTop: 10 }}>
                        No live branches returned for this repository.
                      </p>
                    ) : rows ? (
                      <>
                        <p className="muted" style={{ marginTop: 10 }}>
                          Branches are fetched live from GitHub. Commit counts are shown from the latest snapshot when available.
                        </p>
                        <div style={{ marginTop: 10 }}>
                          <Table
                            headers={["Branch", "Default", "Commits (snapshot)", "Ahead of main", "Behind main", "Status"]}
                            rows={rows}
                          />
                        </div>
                        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                          <label className="muted" htmlFor={`branch-commit-select-${link.id}`}>
                            Select branch to view 10 most recent commits
                          </label>
                          <select
                            id={`branch-commit-select-${link.id}`}
                            style={styles.select}
                            value={selectedBranchByLinkId[link.id] || ""}
                            onChange={(e) => {
                              const nextBranch = e.target.value;
                              setSelectedBranchByLinkId((prev) => ({ ...prev, [link.id]: nextBranch }));
                              void fetchBranchCommits(link.id, nextBranch);
                            }}
                            disabled={Boolean(liveBranchesLoadingByLinkId[link.id])}
                          >
                            {(liveBranchesByLinkId[link.id]?.branches || []).map((branch) => (
                              <option key={branch.name} value={branch.name}>
                                {branch.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {branchCommitsLoadingByLinkId[link.id] ? (
                          <p className="muted" style={{ marginTop: 10 }}>
                            Loading recent commits...
                          </p>
                        ) : null}
                        {branchCommitsErrorByLinkId[link.id] ? (
                          <p className="muted" style={{ marginTop: 10 }}>
                            Failed to load branch commits: {branchCommitsErrorByLinkId[link.id]}
                          </p>
                        ) : null}
                        {branchCommitsByLinkId[link.id]?.commits?.length ? (
                          <div style={{ marginTop: 10 }}>
                            <Table
                              headers={["Commit", "Date", "Additions", "Deletions"]}
                              columnTemplate="minmax(0, 1.8fr) minmax(170px, 220px) minmax(90px, 110px) minmax(90px, 110px)"
                              rows={branchCommitsByLinkId[link.id]!.commits.map((commit) => [
                                <div key={commit.sha} className="stack" style={{ gap: 2 }}>
                                  <a href={commit.htmlUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                                    {commit.message || "(no message)"}
                                  </a>
                                  <span className="muted" style={{ fontSize: 12 }}>
                                    {commit.sha.slice(0, 8)} • {commit.authorLogin || commit.authorEmail || "unknown"}
                                  </span>
                                </div>,
                                commit.date ? new Date(commit.date).toLocaleString() : "-",
                                commit.additions ?? "-",
                                commit.deletions ?? "-",
                              ])}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </section>
      ) : null}

      {activeTab === "configurations" ? (
        <>
          <section style={styles.panel}>
            <div style={styles.sectionHeader}>
              <div className="stack" style={{ gap: 4 }}>
                <p style={styles.sectionKicker}>Setup</p>
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
            <p className="muted" style={{ marginTop: 10 }}>
              Connect GitHub first, then install or grant repository access to the GitHub App if repositories do not appear.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
