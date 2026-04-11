"use client";

import { useEffect, useState } from "react";
import {
  listLiveProjectGithubRepoBranchCommits,
  listLiveProjectGithubRepoBranches,
  listLiveProjectGithubRepoMyCommits,
} from "../api/client";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubLiveProjectRepoMyCommits,
  ProjectGithubRepoLink,
} from "../types";

type Params = {
  activeTab: "repositories" | "my-commits" | "branches" | "configurations" | null;
  loading: boolean;
  links: ProjectGithubRepoLink[];
  connection: GithubConnectionStatus | null;
  latestSnapshotByLinkId: Record<number, GithubLatestSnapshot["snapshot"] | null>;
};

export function useGithubProjectReposLiveData({
  activeTab,
  loading,
  links,
  connection,
  latestSnapshotByLinkId,
}: Params) {
  const [liveBranchesByLinkId, setLiveBranchesByLinkId] = useState<Record<number, GithubLiveProjectRepoBranches | null>>({});
  const [liveBranchesLoadingByLinkId, setLiveBranchesLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [liveBranchesErrorByLinkId, setLiveBranchesErrorByLinkId] = useState<Record<number, string | null>>({});
  const [liveBranchesRefreshing, setLiveBranchesRefreshing] = useState(false);
  const [selectedBranchByLinkId, setSelectedBranchByLinkId] = useState<Record<number, string>>({});
  const [branchCommitsByLinkId, setBranchCommitsByLinkId] = useState<Record<number, GithubLiveProjectRepoBranchCommits | null>>({});
  const [branchCommitsLoadingByLinkId, setBranchCommitsLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [branchCommitsErrorByLinkId, setBranchCommitsErrorByLinkId] = useState<Record<number, string | null>>({});
  const [branchSearchByLinkId, setBranchSearchByLinkId] = useState<Record<number, string>>({});
  const [myCommitsByLinkId, setMyCommitsByLinkId] = useState<Record<number, GithubLiveProjectRepoMyCommits | null>>({});
  const [myCommitsLoadingByLinkId, setMyCommitsLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [myCommitsErrorByLinkId, setMyCommitsErrorByLinkId] = useState<Record<number, string | null>>({});

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

  async function fetchLiveBranchesForLinks(
    linkIds: number[],
    options?: { force?: boolean; queryByLinkId?: Record<number, string> },
  ) {
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
      for (const id of idsToFetch) {next[id] = true;}
      return next;
    });
    setLiveBranchesErrorByLinkId((prev) => {
      const next = { ...prev };
      for (const id of idsToFetch) {next[id] = null;}
      return next;
    });

    await Promise.all(
      idsToFetch.map(async (linkId) => {
        try {
          const query = options?.queryByLinkId?.[linkId]?.trim() || "";
          const data = query
            ? await listLiveProjectGithubRepoBranches(linkId, { query })
            : await listLiveProjectGithubRepoBranches(linkId);
          setLiveBranchesByLinkId((prev) => ({ ...prev, [linkId]: data }));
          setSelectedBranchByLinkId((prev) => {
            if (prev[linkId]) {return prev;}
            const preferredMainBranch = data.branches.find(
              (branch) => branch.name.trim().toLowerCase() === "main"
            )?.name;
            const defaultBranch =
              preferredMainBranch ||
              data.branches.find((branch) => branch.isDefault)?.name ||
              data.branches[0]?.name ||
              "";
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
    await fetchLiveBranchesForLinks(links.map((link) => link.id), {
      force: true,
      queryByLinkId: branchSearchByLinkId,
    });
  }

  function setBranchSearchQuery(linkId: number, query: string) {
    setBranchSearchByLinkId((prev) => ({
      ...prev,
      [linkId]: query,
    }));
  }

  function getBranchSearchQuery(linkId: number) {
    return branchSearchByLinkId[linkId] ?? "";
  }

  async function fetchBranchCommits(linkId: number, branchName: string) {
    if (!branchName) {return;}
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

  useEffect(() => {
    if (activeTab !== "branches" || loading || links.length === 0) {return;}
    const timer = window.setTimeout(() => {
      void fetchLiveBranchesForLinks(
        links.map((link) => link.id),
        { force: true, queryByLinkId: branchSearchByLinkId }
      );
    }, 250);
    return () => window.clearTimeout(timer);
    // `fetchLiveBranchesForLinks` depends on live branch cache/loading maps by design.
    // Re-running this effect on each cache mutation causes redundant requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, links, branchSearchByLinkId]);

  useEffect(() => {
    if (activeTab !== "branches" || loading || links.length === 0) {return;}
    for (const link of links) {
      const selectedBranch = selectedBranchByLinkId[link.id];
      if (!selectedBranch) {continue;}
      const currentCommitData = branchCommitsByLinkId[link.id];
      if (currentCommitData?.branch === selectedBranch) {continue;}
      if (branchCommitsLoadingByLinkId[link.id]) {continue;}
      void fetchBranchCommits(link.id, selectedBranch);
    }
    // This effect intentionally reacts to selected-branch changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, links, selectedBranchByLinkId]);

  useEffect(() => {
    if (activeTab !== "my-commits" || loading || links.length === 0 || !connection?.connected) {return;}
    for (const link of links) {
      if (myCommitsLoadingByLinkId[link.id]) {continue;}
      const existing = myCommitsByLinkId[link.id];
      if (!existing) {
        void fetchMyCommits(link.id, 1);
        continue;
      }
      if (!existing.totals) {
        void fetchMyCommits(link.id, 1, { includeTotals: true });
      }
    }
    // This effect intentionally reacts to tab/link readiness only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, links, connection?.connected]);

  useEffect(() => {
    if (loading || activeTab === "my-commits" || links.length === 0 || !connection?.connected) {return;}
    const timer = window.setTimeout(() => {
      for (const link of links) {
        if (myCommitsByLinkId[link.id] || myCommitsLoadingByLinkId[link.id]) {continue;}
        void fetchMyCommits(link.id, 1, { includeTotals: false });
      }
    }, 500);
    return () => window.clearTimeout(timer);
    // This effect intentionally backfills missing data and skips cache/loading deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeTab, links, connection?.connected]);

  return {
    liveBranchesByLinkId,
    liveBranchesLoadingByLinkId,
    liveBranchesErrorByLinkId,
    liveBranchesRefreshing,
    selectedBranchByLinkId,
    setSelectedBranchByLinkId,
    branchCommitsByLinkId,
    branchCommitsLoadingByLinkId,
    branchCommitsErrorByLinkId,
    setBranchSearchQuery,
    getBranchSearchQuery,
    myCommitsByLinkId,
    myCommitsLoadingByLinkId,
    myCommitsErrorByLinkId,
    buildBranchRows,
    fetchBranchCommits,
    fetchMyCommits,
    handleRefreshLiveBranches,
  };
}
