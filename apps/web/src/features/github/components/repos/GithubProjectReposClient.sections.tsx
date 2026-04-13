"use client";

import type { ComponentProps } from "react";
import { Button } from "@/shared/ui/Button";
import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";
import { GithubRepoLinkCard } from "../GithubRepoLinkCard";
import { GithubProjectReposConfigurationsTab } from "./GithubProjectReposConfigurationsTab";
import { GithubProjectReposRepositoriesTab } from "./GithubProjectReposRepositoriesTab";
import {
  GITHUB_PROJECT_REPOS_TABS as tabs,
  type GithubProjectReposTabKey as TabKey,
} from "./client/GithubProjectReposClient.tabs";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubMappingCoverage,
  ProjectGithubRepoLink,
} from "../../types";

type GithubProjectReposClientStatusMessagesProps = {
  info: string | null;
  error: string | null;
};

export function GithubProjectReposClientStatusMessages({
  info,
  error,
}: GithubProjectReposClientStatusMessagesProps) {
  return (
    <>
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
    </>
  );
}

type GithubProjectReposClientTabNavProps = {
  activeTab: TabKey | null;
  onChange: (tab: TabKey) => void;
};

export function GithubProjectReposClientTabNav({
  activeTab,
  onChange,
}: GithubProjectReposClientTabNavProps) {
  return (
    <section className="github-project-repos-tabs">
      <div className="github-project-repos-tabs__row">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "primary" : "ghost"}
            onClick={() => onChange(tab.key)}
            className={`github-project-repos-tabs__btn${activeTab === tab.key ? " is-active" : ""}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

type GithubProjectReposMyCodeActivitySectionProps = {
  loading: boolean;
  connection: GithubConnectionStatus | null;
  links: ProjectGithubRepoLink[];
  coverageByLinkId: Record<number, GithubMappingCoverage | null>;
  latestSnapshotByLinkId: Record<number, GithubLatestSnapshot["snapshot"] | null>;
};

export function GithubProjectReposMyCodeActivitySection({
  loading,
  connection,
  links,
  coverageByLinkId,
  latestSnapshotByLinkId,
}: GithubProjectReposMyCodeActivitySectionProps) {
  return (
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
          {loading ? (
            <div role="status" aria-live="polite">
              <SkeletonText lines={1} widths={["42%"]} />
              <span className="ui-visually-hidden">Loading personal analytics...</span>
            </div>
          ) : null}
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
  );
}

type GithubProjectReposTeamCodeActivitySectionProps = {
  loading: boolean;
  busy: boolean;
  linking: boolean;
  connection: GithubConnectionStatus | null;
  needsGithubAppInstall: boolean;
  workspaceReadOnly?: boolean;
  onInstallGithubApp: () => void;
  onDisconnect: () => Promise<void>;
  onConnect: () => Promise<void>;
  repositoriesTabProps: ComponentProps<typeof GithubProjectReposRepositoriesTab>;
};

export function GithubProjectReposTeamCodeActivitySection({
  loading,
  busy,
  linking,
  connection,
  needsGithubAppInstall,
  workspaceReadOnly = false,
  onInstallGithubApp,
  onDisconnect,
  onConnect,
  repositoriesTabProps,
}: GithubProjectReposTeamCodeActivitySectionProps) {
  return (
    <div className="stack github-project-repos-section">
      <section className="github-project-repos-section__header-card">
        <p className="github-project-repos-section__kicker">Team code activity</p>
        <h2 className="github-project-repos-section__title">Repository analytics and contributor evidence</h2>
        <p className="muted github-project-repos-section__description">
          Team-level metrics, contributor breakdown, and branch-level repository activity.
        </p>
      </section>

      {!workspaceReadOnly && (!connection?.connected || needsGithubAppInstall) ? (
        <GithubProjectReposConfigurationsTab
          loading={loading}
          busy={busy}
          connection={connection}
          needsGithubAppInstall={needsGithubAppInstall}
          onInstallGithubApp={onInstallGithubApp}
          onDisconnect={onDisconnect}
          onConnect={onConnect}
        />
      ) : null}

      <GithubProjectReposRepositoriesTab
        {...repositoriesTabProps}
        loading={loading}
        busy={busy}
        linking={linking}
        connection={connection}
      />
    </div>
  );
}
