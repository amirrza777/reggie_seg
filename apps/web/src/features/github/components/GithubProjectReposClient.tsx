"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import {
  disconnectGithubAccount,
  getGithubConnectionStatus,
  getGithubOAuthConnectUrl,
  listProjectGithubRepoLinks,
} from "../api/client";
import type { GithubConnectionStatus, ProjectGithubRepoLink } from "../types";

type GithubProjectReposClientProps = {
  projectId: string;
};

const styles = {
  panel: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
    padding: 16,
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  } as React.CSSProperties,
  list: { marginTop: 10 } as React.CSSProperties,
  listItem: {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--glass-surface)",
    marginBottom: 8,
  } as React.CSSProperties,
};

export function GithubProjectReposClient({ projectId }: GithubProjectReposClientProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<GithubConnectionStatus | null>(null);
  const [links, setLinks] = useState<ProjectGithubRepoLink[]>([]);

  const numericProjectId = Number(projectId);

  async function load() {
    if (Number.isNaN(numericProjectId)) {
      setError("Invalid project id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [status, repoLinks] = await Promise.all([
        getGithubConnectionStatus(),
        listProjectGithubRepoLinks(numericProjectId),
      ]);
      setConnection(status);
      setLinks(repoLinks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GitHub data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await getGithubOAuthConnectUrl();
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

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section style={styles.panel}>
        <div style={styles.row}>
          <div className="stack" style={{ gap: 4 }}>
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
            <Button variant="ghost" onClick={handleDisconnect} disabled={busy || loading}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={busy || loading}>
              Connect GitHub
            </Button>
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.row}>
          <strong>Linked repositories</strong>
          <Button variant="ghost" onClick={() => void load()} disabled={loading || busy}>
            Refresh
          </Button>
        </div>
        <div style={styles.list}>
          {loading ? <p className="muted">Loading repositories...</p> : null}
          {!loading && links.length === 0 ? <p className="muted">No repositories linked to this project yet.</p> : null}
          {!loading &&
            links.map((link) => (
              <div key={link.id} style={styles.listItem}>
                <strong>{link.repository.fullName}</strong>
                <p className="muted">
                  {link.repository.isPrivate ? "Private" : "Public"} • default branch {link.repository.defaultBranch || "unknown"}
                </p>
              </div>
            ))}
        </div>
      </section>

      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}
