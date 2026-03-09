"use client";

import { Button } from "@/shared/ui/Button";
import type { GithubConnectionStatus } from "../types";

type Props = {
  loading: boolean;
  busy: boolean;
  connection: GithubConnectionStatus | null;
  needsGithubAppInstall: boolean;
  onInstallGithubApp: () => void;
  onDisconnect: () => Promise<void>;
  onConnect: () => Promise<void>;
};

export function GithubProjectReposConfigurationsTab({
  loading,
  busy,
  connection,
  needsGithubAppInstall,
  onInstallGithubApp,
  onDisconnect,
  onConnect,
}: Props) {
  return (
    <section className="github-repos-tab">
      <div className="github-repos-tab__header">
        <div className="ui-stack-xs">
          <p className="github-repos-tab__kicker">Setup</p>
          <strong>GitHub account</strong>
          {loading ? (
            <p className="muted">Loading connection...</p>
          ) : connection?.connected ? (
            <p className="muted">Connected as @{connection.account?.login}</p>
          ) : (
            <p className="muted">No GitHub account connected.</p>
          )}
        </div>
        {connection?.connected ? (
          <div className="github-repos-tab__actions">
            {needsGithubAppInstall ? (
              <Button variant="ghost" onClick={onInstallGithubApp} disabled={busy || loading}>
                Install GitHub App
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => void onDisconnect()} disabled={busy || loading}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={() => void onConnect()} disabled={busy || loading}>
            Connect GitHub
          </Button>
        )}
      </div>
      <p className="muted github-repos-tab__helper">
        Connect GitHub first, then install or grant repository access to the GitHub App if repositories do not appear.
      </p>
    </section>
  );
}
