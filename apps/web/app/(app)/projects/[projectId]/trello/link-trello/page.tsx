"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getConnectUrl } from "@/features/trello/api/client";

export default function LinkTrelloPage() {
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectTrello = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await getConnectUrl();
      if (!url) throw new Error("Missing Trello authorisation URL.");
      window.location.href = url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to start Trello connection.");
    }
  };

  return (
    <section className="section container">
      <div className="stack">
        <h1>Connect your Trello account</h1>
        <p className="lede">
          Authorise this app to access your Trello boards so you can link one to your team.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={connectTrello}
          disabled={loading}
        >
          {loading ? "Connecting…" : "Connect Trello"}
        </button>
        {error ? (
          <p role="alert" className="muted">
            {error}
          </p>
        ) : null}
        {projectId ? (
          <Link href={`/projects/${projectId}`} className="link-ghost">
            ← Back to project
          </Link>
        ) : null}
      </div>
    </section>
  );
}
