"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import { GithubProjectReposHero } from "./GithubProjectReposHero";
import { GithubProjectReposRepositoriesTab } from "./GithubProjectReposRepositoriesTab";
import { GithubProjectReposMyCommitsTab } from "./GithubProjectReposMyCommitsTab";
import { GithubProjectReposBranchesTab } from "./GithubProjectReposBranchesTab";
import { GithubProjectReposConfigurationsTab } from "./GithubProjectReposConfigurationsTab";
import { useGithubProjectReposLiveData } from "./useGithubProjectReposLiveData";
import { githubProjectReposClientStyles as styles } from "./GithubProjectReposClient.styles";
import {
  GITHUB_PROJECT_REPOS_TABS as tabs,
  type GithubProjectReposTabKey as TabKey,
} from "./GithubProjectReposClient.tabs";
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

export function GithubProjectReposClient({ projectId }: GithubProjectReposClientProps) {
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

  const {
    liveBranchesByLinkId,
    liveBranchesLoadingByLinkId,
    liveBranchesErrorByLinkId,
    liveBranchesRefreshing,
    selectedBranchByLinkId,
    setSelectedBranchByLinkId,
    branchCommitsByLinkId,
    branchCommitsLoadingByLinkId,
    branchCommitsErrorByLinkId,
    myCommitsByLinkId,
    myCommitsLoadingByLinkId,
    myCommitsErrorByLinkId,
    buildBranchRows,
    fetchBranchCommits,
    fetchMyCommits,
    handleRefreshLiveBranches,
  } = useGithubProjectReposLiveData({
    activeTab,
    loading,
    links,
    connection,
    latestSnapshotByLinkId,
  });

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
        <GithubProjectReposRepositoriesTab
          styles={styles}
          loading={loading}
          busy={busy}
          linking={linking}
          connection={connection}
          links={links}
          availableRepos={availableRepos}
          selectedRepoId={selectedRepoId}
          setSelectedRepoId={setSelectedRepoId}
          coverageByLinkId={coverageByLinkId}
          latestSnapshotByLinkId={latestSnapshotByLinkId}
          currentGithubLogin={connection?.account?.login ?? null}
          removingLinkId={removingLinkId}
          onRefresh={handleRefreshSnapshots}
          onLinkSelected={handleLinkSelectedRepo}
          onRemoveLink={(linkId) => void handleRemoveLink(linkId)}
        />
      ) : null}

      {activeTab === "my-commits" ? (
        <GithubProjectReposMyCommitsTab
          styles={styles}
          loading={loading}
          connection={connection}
          links={links}
          latestSnapshotByLinkId={latestSnapshotByLinkId}
          myCommitsByLinkId={myCommitsByLinkId}
          myCommitsLoadingByLinkId={myCommitsLoadingByLinkId}
          myCommitsErrorByLinkId={myCommitsErrorByLinkId}
          fetchMyCommits={fetchMyCommits}
        />
      ) : null}

      {activeTab === "branches" ? (
        <GithubProjectReposBranchesTab
          styles={styles}
          loading={loading}
          liveBranchesRefreshing={liveBranchesRefreshing}
          links={links}
          latestSnapshotByLinkId={latestSnapshotByLinkId}
          liveBranchesByLinkId={liveBranchesByLinkId}
          liveBranchesLoadingByLinkId={liveBranchesLoadingByLinkId}
          liveBranchesErrorByLinkId={liveBranchesErrorByLinkId}
          selectedBranchByLinkId={selectedBranchByLinkId}
          branchCommitsByLinkId={branchCommitsByLinkId}
          branchCommitsLoadingByLinkId={branchCommitsLoadingByLinkId}
          branchCommitsErrorByLinkId={branchCommitsErrorByLinkId}
          buildBranchRows={buildBranchRows}
          handleRefreshLiveBranches={handleRefreshLiveBranches}
          onSelectBranch={(linkId, nextBranch) => {
            setSelectedBranchByLinkId((prev) => ({ ...prev, [linkId]: nextBranch }));
            void fetchBranchCommits(linkId, nextBranch);
          }}
        />
      ) : null}

      {activeTab === "configurations" ? (
        <GithubProjectReposConfigurationsTab
          styles={styles}
          loading={loading}
          busy={busy}
          connection={connection}
          needsGithubAppInstall={needsGithubAppInstall}
          onInstallGithubApp={handleOpenGithubAppInstall}
          onDisconnect={handleDisconnect}
          onConnect={handleConnect}
        />
      ) : null}
    </div>
  );
}
