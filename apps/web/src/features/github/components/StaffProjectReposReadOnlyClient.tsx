"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import {
  analyseProjectGithubRepo,
  getLatestProjectGithubSnapshot,
  getProjectGithubMappingCoverage,
  listProjectGithubRepoLinks,
} from "../api/client";
import type { GithubLatestSnapshot, GithubMappingCoverage, ProjectGithubRepoLink } from "../types";

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
  const [coverageByLinkId, setCoverageByLinkId] = useState<Record<number, GithubMappingCoverage | null>>({});
  const [latestSnapshotByLinkId, setLatestSnapshotByLinkId] = useState<
    Record<number, GithubLatestSnapshot["snapshot"] | null>
  >({});

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

  async function loadData() {
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
  }

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

  useEffect(() => {
    void loadData();
  }, [projectId]);

  return (
    <section className="github-repos-tab" aria-label="Staff repository analytics">
      <div className="github-repos-tab__header">
        <div className="github-repos-tab__title">
          <p className="github-repos-tab__kicker">Repositories</p>
          <strong>Team repository analytics</strong>
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
        Repository charts are project-level evidence and are shared across all teams in this project.
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

      {!loading &&
        links.map((link) => (
          <GithubRepoLinkCard
            key={link.id}
            link={link}
            coverage={coverageByLinkId[link.id] ?? null}
            snapshot={latestSnapshotByLinkId[link.id] ?? null}
            currentGithubLogin={null}
            readOnly
            viewerMode="staff"
          />
        ))}
    </section>
  );
}

