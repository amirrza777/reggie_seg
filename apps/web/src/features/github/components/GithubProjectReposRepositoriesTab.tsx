"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubLiveProjectRepoBranchCommits,
  GithubLiveProjectRepoBranches,
  GithubMappingCoverage,
  GithubRepositoryOption,
  ProjectGithubRepoLink,
} from "../types";

type Props = {
  loading: boolean;
  busy: boolean;
  linking: boolean;
  connection: GithubConnectionStatus | null;
  links: ProjectGithubRepoLink[];
  availableRepos: GithubRepositoryOption[];
  selectedRepoId: string;
  setSelectedRepoId: (value: string) => void;
  coverageByLinkId: Record<number, GithubMappingCoverage | null>;
  latestSnapshotByLinkId: Record<number, GithubLatestSnapshot["snapshot"] | null>;
  currentGithubLogin: string | null;
  liveBranchesByLinkId?: Record<number, GithubLiveProjectRepoBranches | null>;
  liveBranchesLoadingByLinkId?: Record<number, boolean>;
  liveBranchesErrorByLinkId?: Record<number, string | null>;
  liveBranchesRefreshing?: boolean;
  selectedBranchByLinkId?: Record<number, string>;
  setSelectedBranchByLinkId?: Dispatch<SetStateAction<Record<number, string>>>;
  branchCommitsByLinkId?: Record<number, GithubLiveProjectRepoBranchCommits | null>;
  branchCommitsLoadingByLinkId?: Record<number, boolean>;
  branchCommitsErrorByLinkId?: Record<number, string | null>;
  removingLinkId: number | null;
  onRefresh: () => Promise<void>;
  onRefreshBranches?: () => Promise<void>;
  onFetchBranchCommits?: (linkId: number, branchName: string) => Promise<void>;
  onLinkSelected: () => Promise<void>;
  onRemoveLink: (linkId: number) => void;
};

export function GithubProjectReposRepositoriesTab(props: Props) {
  const {
    loading,
    busy,
    linking,
    connection,
    links,
    availableRepos,
    selectedRepoId,
    setSelectedRepoId,
    coverageByLinkId,
    latestSnapshotByLinkId,
    currentGithubLogin,
    liveBranchesByLinkId = {},
    liveBranchesLoadingByLinkId = {},
    liveBranchesErrorByLinkId = {},
    liveBranchesRefreshing = false,
    selectedBranchByLinkId = {},
    setSelectedBranchByLinkId = () => undefined,
    branchCommitsByLinkId = {},
    branchCommitsLoadingByLinkId = {},
    branchCommitsErrorByLinkId = {},
    removingLinkId,
    onRefresh,
    onRefreshBranches = async () => undefined,
    onFetchBranchCommits = async () => undefined,
    onLinkSelected,
    onRemoveLink,
  } = props;
  const selectedRepo = availableRepos.find((repo) => String(repo.githubRepoId) === selectedRepoId);
  const selectedRepoNeedsAppAccess = Boolean(selectedRepo && !selectedRepo.isAppInstalled);
  const hasReposMissingAppAccess = availableRepos.some((repo) => !repo.isAppInstalled);

  return (
    <section className="github-repos-tab">
      <div className="github-repos-tab__header">
        <div className="github-repos-tab__title">
          <p className="github-repos-tab__kicker">Repositories</p>
          <h2 className="github-repos-tab__heading">Linked repositories</h2>
        </div>
        <Button variant="ghost" onClick={() => void onRefresh()} disabled={loading || busy}>
          {busy && links.length > 0 ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <div className="github-repos-tab__list">
        {connection?.connected && links.length === 0 ? (
          <div className="ui-stack-sm github-repos-tab__link-controls">
            <label className="muted" htmlFor="github-repo-select">
              Select repository to link
            </label>
            <select
              id="github-repo-select"
              className="github-repos-tab__select"
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              disabled={loading || busy || availableRepos.length === 0}
            >
              {availableRepos.length === 0 ? <option value="">No accessible repositories found</option> : null}
              {availableRepos.map((repo) => (
                <option key={repo.githubRepoId} value={String(repo.githubRepoId)}>
                  {repo.fullName} {repo.isPrivate ? "(private)" : "(public)"}{" "}
                  {repo.isAppInstalled ? "" : "- app access required"}
                </option>
              ))}
            </select>
            <div>
              <Button
                onClick={() => void onLinkSelected()}
                disabled={
                  loading ||
                  busy ||
                  linking ||
                  !selectedRepoId ||
                  availableRepos.length === 0 ||
                  selectedRepoNeedsAppAccess
                }
              >
                {linking ? "Linking and analysing..." : "Link selected repository"}
              </Button>
            </div>
            {selectedRepoNeedsAppAccess ? (
              <p className="muted github-repos-tab__helper">
                GitHub App access is required before this repository can be linked.
              </p>
            ) : null}
            {hasReposMissingAppAccess ? (
              <p className="muted github-repos-tab__helper">
                Some repositories are visible through collaboration access, but need GitHub App installation access
                before linking.
              </p>
            ) : null}
          </div>
        ) : null}
        {connection?.connected && links.length > 0 ? (
          <p className="muted">This project already has a linked repository. Remove it before linking another one.</p>
        ) : null}
        {loading ? <p className="muted">Loading repositories...</p> : null}
        {!loading && links.length === 0 ? <p className="muted">No repositories linked to this project yet.</p> : null}
        {!loading &&
          links.map((link) => (
            <GithubRepoLinkCard
              key={link.id}
              link={link}
              coverage={coverageByLinkId[link.id] ?? null}
              snapshot={latestSnapshotByLinkId[link.id] ?? null}
              currentGithubLogin={currentGithubLogin}
              liveBranches={liveBranchesByLinkId[link.id] ?? null}
              liveBranchesLoading={Boolean(liveBranchesLoadingByLinkId[link.id])}
              liveBranchesError={liveBranchesErrorByLinkId[link.id] ?? null}
              liveBranchesRefreshing={liveBranchesRefreshing}
              selectedBranch={selectedBranchByLinkId[link.id] ?? ""}
              onSelectBranch={(branchName) => {
                setSelectedBranchByLinkId((prev) => ({ ...prev, [link.id]: branchName }));
                void onFetchBranchCommits(link.id, branchName);
              }}
              branchCommits={branchCommitsByLinkId[link.id] ?? null}
              branchCommitsLoading={Boolean(branchCommitsLoadingByLinkId[link.id])}
              branchCommitsError={branchCommitsErrorByLinkId[link.id] ?? null}
              onRefreshBranches={() => void onRefreshBranches()}
              busy={busy}
              loading={loading}
              removingLinkId={removingLinkId}
              onRemoveLink={(linkId) => onRemoveLink(linkId)}
            />
          ))}
      </div>
    </section>
  );
}
