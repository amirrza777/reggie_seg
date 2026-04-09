"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { getConnectUrl } from "@/features/trello/api/client";
import "@/features/trello/styles/link-account.css";

export default function LinkTrelloPage() {
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : "";
  const { canEdit } = useProjectWorkspaceCanEdit();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectTrello = async () => {
    setLoading(true);
    setError(null);
    try {
      const callbackUrl = projectId
        ? `${window.location.origin}/projects/${projectId}/trello/callback`
        : undefined;
      const { url } = await getConnectUrl(callbackUrl);
      if (!url) throw new Error("Missing Trello authorisation URL.");
      window.location.href = url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to start Trello connection.");
    }
  };

  return (
    <section className="stack projects-panel trello-setup trello-setup--simple">
      <header className="projects-panel__header trello-setup__header">
        <h1 className="projects-panel__title">Connect your Trello account</h1>
        <p className="projects-panel__subtitle">
          Authorise this app to access your Trello boards so you can link one to your team.
        </p>
      </header>
      {!canEdit ? (
        <p className="muted">
          This project is archived; you cannot connect or change Trello from here.
        </p>
      ) : (
        <div className="trello-setup__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={connectTrello}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect Trello"}
          </button>
        </div>
      )}
      {error ? <p role="alert" className="ui-note ui-note--error">{error}</p> : null}
    </section>
  );
}
