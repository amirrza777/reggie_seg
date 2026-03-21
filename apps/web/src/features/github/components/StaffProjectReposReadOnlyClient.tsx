"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import {
  analyseProjectGithubRepo,
  getLatestProjectGithubSnapshot,
  getProjectGithubMappingCoverage,
  listLiveProjectGithubRepoBranchCommits,
  listLiveProjectGithubRepoBranches,
  listProjectGithubRepoLinks,
} from "../api/client";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubMappingCoverage,
  ProjectGithubRepoLink,
} from "../types";

type StaffProjectReposReadOnlyClientProps = {
  projectId: string;
  projectName: string;
  teamName: string;
};

export function StaffProjectReposReadOnlyClient({
  projectId,
  projectName,
  teamName,
}: StaffProjectReposReadOnlyClientProps) {
  const numericProjectId = Number(projectId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [links, setLinks] = useState<ProjectGithubRepoLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [coverageByLinkId, setCoverageByLinkId] = useState<Record<number, GithubMappingCoverage | null>>({});
  const [latestSnapshotByLinkId, setLatestSnapshotByLinkId] = useState<
    Record<number, GithubLatestSnapshot["snapshot"] | null>
  >({});

  const [liveBranchesByLinkId, setLiveBranchesByLinkId] = useState<Record<number, GithubLiveProjectRepoBranches | null>>({});
  const [liveBranchesLoadingByLinkId, setLiveBranchesLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [liveBranchesErrorByLinkId, setLiveBranchesErrorByLinkId] = useState<Record<number, string | null>>({});
  const [selectedBranchByLinkId, setSelectedBranchByLinkId] = useState<Record<number, string>>({});
  const [branchCommitsByLinkId, setBranchCommitsByLinkId] = useState<Record<number, GithubLiveProjectRepoBranchCommits | null>>({});
  const [branchCommitsLoadingByLinkId, setBranchCommitsLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [branchCommitsErrorByLinkId, setBranchCommitsErrorByLinkId] = useState<Record<number, string | null>>({});

  const latestAnalysedAt = useMemo(() => {
    let latest: string | null = null;
    for (const snapshot of Object.values(latestSnapshotByLinkId)) {
      if (!snapshot?.analysedAt) continue;
      if (!latest || snapshot.analysedAt > latest) {
        latest = snapshot.analysedAt;
      }
    }
    return latest;
  }, [latestSnapshotByLinkId]);

  const selectedLink =
    (selectedLinkId != null ? links.find((link) => link.id === selectedLinkId) : null) ?? links[0] ?? null;
  const selectedSnapshot = selectedLink ? latestSnapshotByLinkId[selectedLink.id] ?? null : null;
  const selectedCoverage = selectedLink ? coverageByLinkId[selectedLink.id] ?? null : null;
  const selectedBranch = selectedLink ? selectedBranchByLinkId[selectedLink.id] || "" : "";

  const loadData = useCallback(async () => {
    if (Number.isNaN(numericProjectId)) {
      setError("Invalid project ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const repoLinks = await listProjectGithubRepoLinks(numericProjectId);
      setLinks(repoLinks);
      setSelectedLinkId((prev) => {
        if (repoLinks.length === 0) return null;
        if (prev != null && repoLinks.some((link) => link.id === prev)) return prev;
        return repoLinks[0].id;
      });

      if (repoLinks.length === 0) {
        setCoverageByLinkId({});
        setLatestSnapshotByLinkId({});
        return;
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repository analytics.");
    } finally {
      setLoading(false);
    }
  }, [numericProjectId]);

  async function handleRefreshSnapshots() {
    if (links.length === 0) return;

    setRefreshing(true);
    setError(null);
    setInfo(null);

    try {
      await Promise.all(links.map((link) => analyseProjectGithubRepo(link.id)));
      setInfo("Repository snapshots refreshed.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh snapshots.");
    } finally {
      setRefreshing(false);
    }
  }

  const fetchBranches = useCallback(async (linkId: number, options?: { force?: boolean }) => {
    if (!options?.force && (liveBranchesByLinkId[linkId] || liveBranchesLoadingByLinkId[linkId])) {
      return;
    }

    setLiveBranchesLoadingByLinkId((prev) => ({ ...prev, [linkId]: true }));
    setLiveBranchesErrorByLinkId((prev) => ({ ...prev, [linkId]: null }));

    try {
      const data = await listLiveProjectGithubRepoBranches(linkId);
      setLiveBranchesByLinkId((prev) => ({ ...prev, [linkId]: data }));
      setSelectedBranchByLinkId((prev) => {
        if (prev[linkId]) return prev;
        const preferredMainBranch = data.branches.find((branch) => branch.name.trim().toLowerCase() === "main")?.name;
        const nextBranch = preferredMainBranch || data.branches.find((branch) => branch.isDefault)?.name || data.branches[0]?.name || "";
        return nextBranch ? { ...prev, [linkId]: nextBranch } : prev;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load live branches.";
      setLiveBranchesErrorByLinkId((prev) => ({ ...prev, [linkId]: message }));
    } finally {
      setLiveBranchesLoadingByLinkId((prev) => ({ ...prev, [linkId]: false }));
    }
  }, [liveBranchesByLinkId, liveBranchesLoadingByLinkId]);

  const fetchBranchCommits = useCallback(async (linkId: number, branch: string) => {
    if (!branch) return;
    setBranchCommitsLoadingByLinkId((prev) => ({ ...prev, [linkId]: true }));
    setBranchCommitsErrorByLinkId((prev) => ({ ...prev, [linkId]: null }));
    try {
      const commits = await listLiveProjectGithubRepoBranchCommits(linkId, branch, 20);
      setBranchCommitsByLinkId((prev) => ({ ...prev, [linkId]: commits }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load branch commits.";
      setBranchCommitsErrorByLinkId((prev) => ({ ...prev, [linkId]: message }));
    } finally {
      setBranchCommitsLoadingByLinkId((prev) => ({ ...prev, [linkId]: false }));
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedLink) return;
    void fetchBranches(selectedLink.id);
  }, [selectedLink, fetchBranches]);

  useEffect(() => {
    if (!selectedLink || !selectedBranch) return;
    const current = branchCommitsByLinkId[selectedLink.id];
    if (current?.branch === selectedBranch) return;
    if (branchCommitsLoadingByLinkId[selectedLink.id]) return;
    void fetchBranchCommits(selectedLink.id, selectedBranch);
  }, [
    selectedLink,
    selectedBranch,
    branchCommitsByLinkId,
    branchCommitsLoadingByLinkId,
    fetchBranchCommits,
  ]);

  return (
    <section className="github-repos-tab" aria-label="Staff repository analytics">
      <div className="github-repos-tab__header">
        <div className="github-repos-tab__title">
          <p className="github-repos-tab__kicker">Repositories</p>
          <strong>Team repository analytics (staff view)</strong>
        </div>
        <Button
          variant="ghost"
          onClick={() => void handleRefreshSnapshots()}
          disabled={loading || refreshing || links.length === 0}
        >
          {refreshing ? "Refreshing..." : "Refresh snapshots"}
        </Button>
      </div>

      <div className="github-repo-link-card__stats">
        <div className="github-repo-link-card__stat">
          <div className="github-repo-link-card__stat-label">Project</div>
          <div className="github-repo-link-card__stat-value">{projectName}</div>
        </div>
        <div className="github-repo-link-card__stat">
          <div className="github-repo-link-card__stat-label">Team context</div>
          <div className="github-repo-link-card__stat-value">{teamName}</div>
        </div>
        <div className="github-repo-link-card__stat">
          <div className="github-repo-link-card__stat-label">Linked repositories</div>
          <div className="github-repo-link-card__stat-value">{links.length}</div>
        </div>
        <div className="github-repo-link-card__stat">
          <div className="github-repo-link-card__stat-label">Latest snapshot</div>
          <div className="github-repo-link-card__stat-value">
            {latestAnalysedAt ? new Date(latestAnalysedAt).toLocaleString() : "Not analysed yet"}
          </div>
        </div>
      </div>

      <p className="muted github-repos-tab__helper">
        Read-only staff view. Use this as evidence for team activity, contributor distribution, and branch-level commit trails.
      </p>

      {info ? (
        <div className="github-project-repos-status github-project-repos-status--info" style={{ marginTop: 12 }}>
          <p className="muted github-project-repos-status__text">{info}</p>
        </div>
      ) : null}

      {error ? (
        <div className="github-project-repos-status github-project-repos-status--error" style={{ marginTop: 12 }}>
          <p className="muted github-project-repos-status__text">{error}</p>
        </div>
      ) : null}

      {loading ? <p className="muted github-repos-tab__table-wrap">Loading repository analytics...</p> : null}
      {!loading && links.length === 0 ? (
        <p className="muted github-repos-tab__table-wrap">No repositories are linked to this project yet.</p>
      ) : null}

      {!loading && links.length > 1 ? (
        <div className="stack" style={{ gap: 6, marginTop: 12 }}>
          <label className="muted" htmlFor="staff-repo-link-select">
            Repository scope
          </label>
          <select
            id="staff-repo-link-select"
            className="github-repos-tab__select"
            value={String(selectedLink?.id ?? "")}
            onChange={(event) => setSelectedLinkId(Number(event.target.value))}
          >
            {links.map((link) => (
              <option key={link.id} value={link.id}>
                {link.repository.fullName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!loading && selectedLink ? (
        <div className="stack" style={{ marginTop: 12 }}>
          <section className="github-project-repos-section__header-card">
            <p className="github-project-repos-section__kicker">Team overview</p>
            <h2 className="github-project-repos-section__title">Repository contribution evidence</h2>
            <p className="muted github-project-repos-section__description">
              Snapshot-level analytics organised for staff review.
            </p>
          </section>

          <GithubRepoLinkCard
            key={selectedLink.id}
            link={selectedLink}
            coverage={selectedCoverage}
            snapshot={selectedSnapshot}
            currentGithubLogin={null}
            liveBranches={liveBranchesByLinkId[selectedLink.id] ?? null}
            liveBranchesLoading={Boolean(liveBranchesLoadingByLinkId[selectedLink.id])}
            liveBranchesError={liveBranchesErrorByLinkId[selectedLink.id] ?? null}
            selectedBranch={selectedBranch}
            onSelectBranch={(branchName) => {
              setSelectedBranchByLinkId((prev) => ({ ...prev, [selectedLink.id]: branchName }));
              void fetchBranchCommits(selectedLink.id, branchName);
            }}
            branchCommits={branchCommitsByLinkId[selectedLink.id] ?? null}
            branchCommitsLoading={Boolean(branchCommitsLoadingByLinkId[selectedLink.id])}
            branchCommitsError={branchCommitsErrorByLinkId[selectedLink.id] ?? null}
            onRefreshBranches={() => void fetchBranches(selectedLink.id, { force: true })}
            readOnly
            viewerMode="staff"
            chartMode="team"
          />
        </div>
      ) : null}
    </section>
  );
}
