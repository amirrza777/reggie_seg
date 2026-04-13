"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { PageSection } from "@/shared/ui/PageSection";
import { GithubProjectReposHero } from "./GithubProjectReposHero";
import { GithubProjectReposMyCommitsTab } from "./GithubProjectReposMyCommitsTab";
import {
  GithubProjectReposClientStatusMessages,
  GithubProjectReposClientTabNav,
  GithubProjectReposMyCodeActivitySection,
  GithubProjectReposTeamCodeActivitySection,
} from "./GithubProjectReposClient.sections";
import { useGithubProjectReposAutoRefresh } from "./hooks/useGithubProjectReposAutoRefresh";
import { useGithubProjectReposLiveData } from "./hooks/useGithubProjectReposLiveData";
import type { GithubProjectReposTabKey as TabKey } from "./client/GithubProjectReposClient.tabs";
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
} from "../../api/client";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubMappingCoverage,
  GithubRepositoryOption,
  ProjectGithubRepoLink,
} from "../../types";

type GithubProjectReposClientProps = {
  projectId: string;
};

export function GithubProjectReposClient({ projectId }: GithubProjectReposClientProps) {
  const { canEdit: workspaceCanEdit } = useProjectWorkspaceCanEdit();
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
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [searchingRepos, setSearchingRepos] = useState(false);
  const didAutoSelectInitialTabRef = useRef(false);
  const repoSearchRequestRef = useRef(0);

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

  const applyRepositoryOptions = useCallback((repos: GithubRepositoryOption[]) => {
    setAvailableRepos(repos);
    setSelectedRepoId((currentSelectedRepoId) => {
      if (repos.length === 0) {
        return "";
      }
      const selectedRepoStillExists = repos.some((repo) => String(repo.githubRepoId) === currentSelectedRepoId);
      if (selectedRepoStillExists) {
        return currentSelectedRepoId;
      }
      const preferredRepo = repos.find((repo) => repo.isAppInstalled) || repos[0];
      return String(preferredRepo?.githubRepoId || "");
    });
  }, []);

  const loadRepositoryOptions = useCallback(async (query?: string, options?: { suppressLoadingState?: boolean }) => {
    const requestId = repoSearchRequestRef.current + 1;
    repoSearchRequestRef.current = requestId;
    if (!options?.suppressLoadingState) {
      setSearchingRepos(true);
    }

    try {
      const repos = await listGithubRepositories({ query: query?.trim() || undefined });
      if (repoSearchRequestRef.current !== requestId) {
        return;
      }
      applyRepositoryOptions(repos);
    } finally {
      if (repoSearchRequestRef.current === requestId && !options?.suppressLoadingState) {
        setSearchingRepos(false);
      }
    }
  }, [applyRepositoryOptions]);

  const load = useCallback(async () => {
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
        await loadRepositoryOptions(repoSearchQuery, { suppressLoadingState: true });
      } else {
        setAvailableRepos([]);
        setSelectedRepoId("");
        setRepoSearchQuery("");
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
  }, [loadRepositoryOptions, numericProjectId, repoSearchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    didAutoSelectInitialTabRef.current = false;
    setActiveTab(null);
  }, [projectId]);

  useEffect(() => {
    if (!connection?.connected) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadRepositoryOptions(repoSearchQuery).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to search repositories.");
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [connection?.connected, repoSearchQuery, loadRepositoryOptions]);

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
  }, [load]);

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
      let refreshed = false;
      if (links.length > 0) {
        await Promise.all(links.map((link) => analyseProjectGithubRepo(link.id)));
        refreshed = true;
      }
      await load();
      if (refreshed) {
        setInfo("Repository snapshot refreshed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh repository snapshot.");
    } finally {
      setBusy(false);
    }
  }

  useGithubProjectReposAutoRefresh({
    enabled: workspaceCanEdit && !loading && Boolean(connection?.connected) && links.length > 0,
    links,
    latestSnapshotByLinkId,
    busy,
    linking,
    removingLinkId,
    load,
    setBusy,
    setError,
    setInfo,
  });

  if (!loading && !workspaceCanEdit && activeLinkCount === 0) {
    return (
      <PageSection title="Repositories" className="ui-page--project github-project-repos-client">
        <p className="muted">
          No repository was connected to this team before the project was archived.
        </p>
      </PageSection>
    );
  }

  return (
    <div className="stack github-project-repos-client">
      <GithubProjectReposHero
        connectedLogin={connection?.account?.login ?? null}
        accessibleRepoCount={availableRepos.length}
        linkedRepoCount={activeLinkCount}
        loading={loading}
      />
      <GithubProjectReposClientStatusMessages info={info} error={error} />
      <GithubProjectReposClientTabNav activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "my-code-activity" ? (
        <GithubProjectReposMyCodeActivitySection
          loading={loading}
          connection={connection}
          links={links}
          coverageByLinkId={coverageByLinkId}
          latestSnapshotByLinkId={latestSnapshotByLinkId}
        />
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
        <GithubProjectReposTeamCodeActivitySection
          loading={loading}
          busy={busy}
          linking={linking}
          connection={connection}
          needsGithubAppInstall={needsGithubAppInstall}
          workspaceReadOnly={!workspaceCanEdit}
          onInstallGithubApp={handleOpenGithubAppInstall}
          onDisconnect={handleDisconnect}
          onConnect={handleConnect}
          repositoriesTabProps={{
            loading,
            busy,
            linking,
            connection,
            links,
            availableRepos,
            selectedRepoId,
            setSelectedRepoId,
            repoSearchQuery,
            onRepoSearchQueryChange: setRepoSearchQuery,
            searchingRepos,
            coverageByLinkId,
            latestSnapshotByLinkId,
            currentGithubLogin: connection?.account?.login ?? null,
            liveBranchesByLinkId,
            liveBranchesLoadingByLinkId,
            liveBranchesErrorByLinkId,
            liveBranchesRefreshing,
            selectedBranchByLinkId,
            setSelectedBranchByLinkId,
            branchCommitsByLinkId,
            branchCommitsLoadingByLinkId,
            branchCommitsErrorByLinkId,
            removingLinkId,
            onRefresh: handleRefreshSnapshots,
            onRefreshBranches: handleRefreshLiveBranches,
            onFetchBranchCommits: fetchBranchCommits,
            onLinkSelected: handleLinkSelectedRepo,
            onRemoveLink: (linkId) => void handleRemoveLink(linkId),
            readOnlyWorkspace: !workspaceCanEdit,
          }}
        />
      ) : null}
    </div>
  );
}
