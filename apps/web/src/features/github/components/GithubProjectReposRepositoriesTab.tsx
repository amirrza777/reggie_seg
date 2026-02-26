"use client";

import type React from "react";
import { Button } from "@/shared/ui/Button";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubMappingCoverage,
  GithubRepositoryOption,
  ProjectGithubRepoLink,
} from "../types";

type StylesMap = Record<string, React.CSSProperties>;

type Props = {
  styles: StylesMap;
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
  removingLinkId: number | null;
  onRefresh: () => Promise<void>;
  onLinkSelected: () => Promise<void>;
  onRemoveLink: (linkId: number) => void;
};

export function GithubProjectReposRepositoriesTab(props: Props) {
  const {
    styles,
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
    removingLinkId,
    onRefresh,
    onLinkSelected,
    onRemoveLink,
  } = props;

  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleWrap}>
          <p style={styles.sectionKicker}>Repositories</p>
          <strong>Linked repositories</strong>
        </div>
        <Button variant="ghost" onClick={() => void onRefresh()} disabled={loading || busy}>
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
              {availableRepos.length === 0 ? <option value="">No accessible repositories found</option> : null}
              {availableRepos.map((repo) => (
                <option key={repo.githubRepoId} value={String(repo.githubRepoId)}>
                  {repo.fullName} {repo.isPrivate ? "(private)" : "(public)"}
                </option>
              ))}
            </select>
            <div>
              <Button
                onClick={() => void onLinkSelected()}
                disabled={loading || busy || linking || !selectedRepoId || availableRepos.length === 0}
              >
                {linking ? "Linking and analysing..." : "Link selected repository"}
              </Button>
            </div>
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
