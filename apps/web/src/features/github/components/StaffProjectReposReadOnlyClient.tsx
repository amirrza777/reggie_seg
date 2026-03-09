"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import {
  analyseProjectGithubRepo,
  getLatestProjectGithubSnapshot,
  getProjectGithubMappingCoverage,
  listLiveProjectGithubRepoBranchCommits,
  listProjectGithubRepoLinks,
} from "../api/client";
import type {
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubMappingCoverage,
  ProjectGithubRepoLink,
} from "../types";

type StaffProjectReposReadOnlyClientProps = {
  projectId: string;
  projectName: string;
  teamName: string;
};

type StaffRepoTabKey = "overview" | "commits" | "contributors";

const staffRepoTabs: Array<{ key: StaffRepoTabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "commits", label: "Recent commits" },
  { key: "contributors", label: "Contributor drilldown" },
];

function formatShortDateTime(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatContributorMatch(stat: GithubLatestSnapshot["snapshot"]["userStats"][number]) {
  if (!stat.isMatched) return "Unmatched";
  if (stat.githubLogin) return "Matched";
  return "Matched (no login)";
}

function contributorIdentityKey(
  stat: GithubLatestSnapshot["snapshot"]["userStats"][number],
  index: number
) {
  return stat.githubLogin?.toLowerCase() || `mapped-${stat.mappedUserId ?? "none"}-${index}`;
}

export function StaffProjectReposReadOnlyClient({
  projectId,
  projectName,
  teamName,
}: StaffProjectReposReadOnlyClientProps) {
  const numericProjectId = Number(projectId);
  const [activeTab, setActiveTab] = useState<StaffRepoTabKey>("overview");
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
  const [recentCommitsByLinkId, setRecentCommitsByLinkId] = useState<
    Record<number, GithubLiveProjectRepoBranchCommits | null>
  >({});
  const [recentCommitsLoadingByLinkId, setRecentCommitsLoadingByLinkId] = useState<Record<number, boolean>>({});
  const [recentCommitsErrorByLinkId, setRecentCommitsErrorByLinkId] = useState<Record<number, string | null>>({});
  const [selectedContributorKeyByLinkId, setSelectedContributorKeyByLinkId] = useState<Record<number, string>>({});

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
      setRecentCommitsByLinkId({});
      setRecentCommitsLoadingByLinkId({});
      setRecentCommitsErrorByLinkId({});
      setSelectedLinkId((prev) => {
        if (repoLinks.length === 0) return null;
        if (prev != null && repoLinks.some((link) => link.id === prev)) return prev;
        return repoLinks[0].id;
      });

      if (repoLinks.length === 0) {
        setCoverageByLinkId({});
        setLatestSnapshotByLinkId({});
        setRecentCommitsByLinkId({});
        setRecentCommitsLoadingByLinkId({});
        setRecentCommitsErrorByLinkId({});
        setSelectedContributorKeyByLinkId({});
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const fetchRecentCommitsForSelectedLink = useCallback(async (link: ProjectGithubRepoLink) => {
    const branch = link.repository.defaultBranch || "main";
    setRecentCommitsLoadingByLinkId((prev) => ({ ...prev, [link.id]: true }));
    setRecentCommitsErrorByLinkId((prev) => ({ ...prev, [link.id]: null }));
    try {
      const data = await listLiveProjectGithubRepoBranchCommits(link.id, branch, 20);
      setRecentCommitsByLinkId((prev) => ({ ...prev, [link.id]: data }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load recent commits.";
      setRecentCommitsErrorByLinkId((prev) => ({ ...prev, [link.id]: message }));
    } finally {
      setRecentCommitsLoadingByLinkId((prev) => ({ ...prev, [link.id]: false }));
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "commits") return;
    if (!selectedLink) return;
    if (recentCommitsByLinkId[selectedLink.id] || recentCommitsLoadingByLinkId[selectedLink.id]) return;
    void fetchRecentCommitsForSelectedLink(selectedLink);
  }, [activeTab, selectedLink, recentCommitsByLinkId, recentCommitsLoadingByLinkId, fetchRecentCommitsForSelectedLink]);

  const contributorRows =
    selectedSnapshot?.userStats
      ?.map((stat, index) => ({
        key: contributorIdentityKey(stat, index),
        githubLogin: stat.githubLogin || "Unknown contributor",
        commits: Number(stat.commits ?? 0),
        additions: Number(stat.additions ?? 0),
        deletions: Number(stat.deletions ?? 0),
        commitsByDay: stat.commitsByDay || null,
        matchLabel: formatContributorMatch(stat),
      }))
      .filter((row) => row.commits > 0)
      .sort((a, b) => b.commits - a.commits) ?? [];

  const selectedContributor =
    selectedLink && contributorRows.length > 0
      ? contributorRows.find((row) => row.key === selectedContributorKeyByLinkId[selectedLink.id]) || contributorRows[0]
      : null;

  const selectedContributorDays = Object.entries(selectedContributor?.commitsByDay || {})
    .map(([date, commits]) => ({ date, commits: Number(commits) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

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
        Staff mode is read-only. These repository charts are project-level evidence shared across all teams in this project.
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

      {!loading && links.length > 0 ? (
        <>
          <section className="github-project-repos-tabs">
            <div className="github-project-repos-tabs__row">
              {staffRepoTabs.map((tab) => (
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

          {links.length > 1 ? (
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

          {activeTab === "overview" && selectedLink ? (
            <GithubRepoLinkCard
              key={selectedLink.id}
              link={selectedLink}
              coverage={selectedCoverage}
              snapshot={selectedSnapshot}
              currentGithubLogin={null}
              readOnly
              viewerMode="staff"
            />
          ) : null}

          {activeTab === "commits" && selectedLink ? (
            <section className="github-repos-tab__subpanel">
              <div className="github-repos-tab__title">
                <p className="github-repos-tab__kicker">Recent commits</p>
                <strong>{selectedLink.repository.fullName}</strong>
              </div>
              <div className="github-repos-tab__header">
                <p className="muted github-repos-tab__helper">
                  Latest commits from default branch <strong>{selectedLink.repository.defaultBranch || "main"}</strong>.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => void fetchRecentCommitsForSelectedLink(selectedLink)}
                  disabled={Boolean(recentCommitsLoadingByLinkId[selectedLink.id])}
                >
                  {recentCommitsLoadingByLinkId[selectedLink.id] ? "Refreshing..." : "Refresh commits"}
                </Button>
              </div>
              {recentCommitsLoadingByLinkId[selectedLink.id] ? (
                <p className="muted github-repos-tab__table-wrap">Loading recent commits...</p>
              ) : null}
              {recentCommitsErrorByLinkId[selectedLink.id] ? (
                <p className="muted github-repos-tab__table-wrap">{recentCommitsErrorByLinkId[selectedLink.id]}</p>
              ) : null}
              {!recentCommitsLoadingByLinkId[selectedLink.id] &&
              !recentCommitsErrorByLinkId[selectedLink.id] &&
              (recentCommitsByLinkId[selectedLink.id]?.commits?.length ?? 0) === 0 ? (
                <p className="muted github-repos-tab__table-wrap">No commits were returned for this branch.</p>
              ) : null}
              {(recentCommitsByLinkId[selectedLink.id]?.commits?.length ?? 0) > 0 ? (
                <div className="github-repos-tab__table-wrap stack" style={{ gap: 10 }}>
                  {recentCommitsByLinkId[selectedLink.id]?.commits.map((commit) => (
                    <div key={commit.sha} className="stack github-repos-tab__commit-cell">
                      <a href={commit.htmlUrl} target="_blank" rel="noreferrer" className="github-repos-tab__commit-link">
                        {commit.message}
                      </a>
                      <div className="github-repos-tab__commit-meta-row">
                        <span className="muted github-repos-tab__commit-meta">
                          {commit.authorLogin || commit.authorEmail || "Unknown author"}
                        </span>
                        <span className="muted github-repos-tab__commit-meta">{formatShortDateTime(commit.date)}</span>
                        {typeof commit.additions === "number" || typeof commit.deletions === "number" ? (
                          <span className="muted github-repos-tab__commit-meta">
                            +{commit.additions ?? 0} / -{commit.deletions ?? 0}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === "contributors" && selectedLink ? (
            <section className="github-repos-tab__subpanel">
              <div className="github-repos-tab__title">
                <p className="github-repos-tab__kicker">Student / contributor focus</p>
                <strong>Contributor breakdown</strong>
              </div>
              {contributorRows.length === 0 ? (
                <p className="muted github-repos-tab__table-wrap">No contributor snapshot data available yet.</p>
              ) : (
                <div className="stack" style={{ gap: 12 }}>
                  <div className="github-repo-link-card__stats">
                    {contributorRows.map((row) => (
                      <button
                        key={row.key}
                        type="button"
                        className={`github-repo-link-card__stat github-repo-link-card__stat--selectable${
                          selectedContributor?.key === row.key ? " github-repo-link-card__stat--selected" : ""
                        }`}
                        onClick={() =>
                          setSelectedContributorKeyByLinkId((prev) => ({
                            ...prev,
                            [selectedLink.id]: row.key,
                          }))
                        }
                      >
                        <div className="github-repo-link-card__stat-label">{row.matchLabel}</div>
                        <div className="github-repo-link-card__stat-value">{row.githubLogin}</div>
                        <div className="github-repo-link-card__stat-subtle">
                          {row.commits} commits • +{row.additions} / -{row.deletions}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedContributor ? (
                    <div className="github-repo-link-card__overview">
                      <p className="github-repo-link-card__section-label">Selected contributor details</p>
                      <div className="github-repo-link-card__stats">
                        <div className="github-repo-link-card__stat">
                          <div className="github-repo-link-card__stat-label">Contributor</div>
                          <div className="github-repo-link-card__stat-value">{selectedContributor.githubLogin}</div>
                        </div>
                        <div className="github-repo-link-card__stat">
                          <div className="github-repo-link-card__stat-label">Commits</div>
                          <div className="github-repo-link-card__stat-value">{selectedContributor.commits}</div>
                        </div>
                        <div className="github-repo-link-card__stat">
                          <div className="github-repo-link-card__stat-label">Line changes</div>
                          <div className="github-repo-link-card__stat-value">
                            +{selectedContributor.additions} / -{selectedContributor.deletions}
                          </div>
                        </div>
                        <div className="github-repo-link-card__stat">
                          <div className="github-repo-link-card__stat-label">Active days in snapshot</div>
                          <div className="github-repo-link-card__stat-value">{selectedContributorDays.length}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
