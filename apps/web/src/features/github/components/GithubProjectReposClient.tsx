"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import { GithubProjectReposHero } from "./GithubProjectReposHero";
import { GithubProjectReposRepositoriesTab } from "./GithubProjectReposRepositoriesTab";
import { GithubProjectReposMyCommitsTab } from "./GithubProjectReposMyCommitsTab";
import { GithubProjectReposConfigurationsTab } from "./GithubProjectReposConfigurationsTab";
import { useGithubProjectReposLiveData } from "./useGithubProjectReposLiveData";
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
  const needsGithubAppInstall = Boolean(
    connection?.connected &&
      typeof error === "string" &&
      error.toLowerCase().includes("not installed on any account or organization")
  );

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
    fetchBranchCommits,
    handleRefreshLiveBranches,
    myCommitsByLinkId,
    myCommitsLoadingByLinkId,
    myCommitsErrorByLinkId,
    fetchMyCommits,
  } = useGithubProjectReposLiveData({
    activeTab:
      activeTab === "my-commits"
        ? "my-commits"
        : activeTab === "team-code-activity"
          ? "branches"
          : null,
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
        if (repos.length === 0) {
          setSelectedRepoId("");
        } else {
          const selectedRepoStillExists = repos.some((repo) => String(repo.githubRepoId) === selectedRepoId);
          if (!selectedRepoStillExists) {
            const preferredRepo = repos.find((repo) => repo.isAppInstalled) || repos[0];
            setSelectedRepoId(String(preferredRepo?.githubRepoId || ""));
          }
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
    setActiveTab("team-code-activity");
    didAutoSelectInitialTabRef.current = true;
  }, [loading]);

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
    if (!chosen.isAppInstalled) {
      setError(
        "GitHub App does not have access to this repository yet. Ask the owner or organization admin to grant access, then refresh."
      );
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
    <div className="stack github-project-repos-client">
      <GithubProjectReposHero
        connectedLogin={connection?.account?.login ?? null}
        accessibleRepoCount={availableRepos.length}
        linkedRepoCount={activeLinkCount}
        loading={loading}
      />
      {info ? (
        <div className="github-project-repos-status github-project-repos-status--info">
          <p className="muted github-project-repos-status__text">{info}</p>
        </div>
      ) : null}
      {error ? (
        <div className="github-project-repos-status github-project-repos-status--error">
          <p className="muted github-project-repos-status__text">{error}</p>
        </div>
      ) : null}
      <section className="github-project-repos-tabs">
        <div className="github-project-repos-tabs__row">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
              className={`github-project-repos-tabs__btn${activeTab === tab.key ? " is-active" : ""}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </section>

      {activeTab === "my-code-activity" ? (
        <div className="stack github-project-repos-section">
          <section className="github-project-repos-section__header-card">
            <p className="github-project-repos-section__kicker">My code activity</p>
            <h2 className="github-project-repos-section__title">Personal contribution analytics</h2>
            <p className="muted github-project-repos-section__description">
              Your contribution share, commit rhythm, and personal activity signals for each linked repository.
            </p>
          </section>

          <section className="github-repos-tab">
            <div className="github-repos-tab__list">
              {loading ? <p className="muted">Loading personal analytics...</p> : null}
              {!loading && !connection?.connected ? (
                <p className="muted">Connect GitHub to view your personal activity analytics.</p>
              ) : null}
              {!loading && connection?.connected && links.length === 0 ? (
                <p className="muted">Link a repository first to view personal code activity.</p>
              ) : null}
              {!loading &&
                connection?.connected &&
                links.map((link) => (
                  <GithubRepoLinkCard
                    key={link.id}
                    link={link}
                    coverage={coverageByLinkId[link.id] ?? null}
                    snapshot={latestSnapshotByLinkId[link.id] ?? null}
                    currentGithubLogin={connection?.account?.login ?? null}
                    readOnly
                    chartMode="personal"
                  />
                ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "my-commits" ? (
        <GithubProjectReposMyCommitsTab
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

      {activeTab === "team-code-activity" ? (
        <div className="stack github-project-repos-section">
          <section className="github-project-repos-section__header-card">
            <p className="github-project-repos-section__kicker">Team code activity</p>
            <h2 className="github-project-repos-section__title">Repository analytics and contributor evidence</h2>
            <p className="muted github-project-repos-section__description">
              Team-level metrics, contributor breakdown, and branch-level repository activity.
            </p>
          </section>

          {!connection?.connected || needsGithubAppInstall ? (
            <GithubProjectReposConfigurationsTab
              loading={loading}
              busy={busy}
              connection={connection}
              needsGithubAppInstall={needsGithubAppInstall}
              onInstallGithubApp={handleOpenGithubAppInstall}
              onDisconnect={handleDisconnect}
              onConnect={handleConnect}
            />
          ) : null}

          <GithubProjectReposRepositoriesTab
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
            liveBranchesByLinkId={liveBranchesByLinkId}
            liveBranchesLoadingByLinkId={liveBranchesLoadingByLinkId}
            liveBranchesErrorByLinkId={liveBranchesErrorByLinkId}
            liveBranchesRefreshing={liveBranchesRefreshing}
            selectedBranchByLinkId={selectedBranchByLinkId}
            setSelectedBranchByLinkId={setSelectedBranchByLinkId}
            branchCommitsByLinkId={branchCommitsByLinkId}
            branchCommitsLoadingByLinkId={branchCommitsLoadingByLinkId}
            branchCommitsErrorByLinkId={branchCommitsErrorByLinkId}
            removingLinkId={removingLinkId}
            onRefresh={handleRefreshSnapshots}
            onRefreshBranches={handleRefreshLiveBranches}
            onFetchBranchCommits={fetchBranchCommits}
            onLinkSelected={handleLinkSelectedRepo}
            onRemoveLink={(linkId) => void handleRemoveLink(linkId)}
          />
        </div>
      ) : null}
    </div>
  );
}
