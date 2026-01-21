'use client';

import { useEffect, useState } from "react";

type HealthResponse = {
  ok?: boolean;
  message?: string;
  [key: string]: unknown;
};

const FALLBACK_API = "http://localhost:3000";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API;

export default function HomePage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBaseUrl}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HealthResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Next.js client</p>
        <h1>Web app is running</h1>
        <p className="lede">
          This page queries the API health endpoint to confirm both services are up.
        </p>

        <div className="meta">
          <span>API base URL</span>
          <code>{apiBaseUrl}</code>
        </div>

        {process.env.NEXT_PUBLIC_API_BASE_URL ? null : (
          <div className="callout warning">
            <strong>Heads up:</strong> NEXT_PUBLIC_API_BASE_URL is not set. Using{" "}
            {FALLBACK_API}.
          </div>
        )}

        <div className="result">
          <span className="label">Health check</span>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : error ? (
            <p className="error">Error: {error}</p>
          ) : (
            <pre>{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      </section>
    </main>
  );
}
