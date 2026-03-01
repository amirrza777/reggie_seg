"use client";

import type React from "react";
import { Button } from "@/shared/ui/Button";
import type { GithubConnectionStatus } from "../types";

type StylesMap = Record<string, React.CSSProperties>;

type Props = {
  styles: StylesMap;
  loading: boolean;
  busy: boolean;
  connection: GithubConnectionStatus | null;
  needsGithubAppInstall: boolean;
  onInstallGithubApp: () => void;
  onDisconnect: () => Promise<void>;
  onConnect: () => Promise<void>;
};

export function GithubProjectReposConfigurationsTab({
  styles,
  loading,
  busy,
  connection,
  needsGithubAppInstall,
  onInstallGithubApp,
  onDisconnect,
  onConnect,
}: Props) {
  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div className="stack" style={{ gap: 4 }}>
          <p style={styles.sectionKicker}>Setup</p>
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
      <p className="muted" style={{ marginTop: 10 }}>
        Connect GitHub first, then install or grant repository access to the GitHub App if repositories do not appear.
      </p>
    </section>
  );
}
