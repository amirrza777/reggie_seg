"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/shared/api/env";
import { getAccessToken } from "@/features/auth/api/session";

export default function LinkTrelloPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectTrello = async () => {
    const token = getAccessToken();
    if (!token) {
      setError("You must be logged in before connecting Trello.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/trello/connect-url`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to start Trello connection.");
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Missing Trello authorization URL.");
      window.location.href = data.url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to start Trello connection.");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Connect your Trello account</h1>
      <button
        onClick={connectTrello}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          backgroundColor: "#0079BF",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          opacity: loading ? 0.6 : 1,
        }}
        disabled={loading}
      >
        {loading ? "Connecting..." : "Connect Trello"}
      </button>
      {error ? <p style={{ color: "#b42318", marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}
