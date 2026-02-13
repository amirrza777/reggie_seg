"use client";

//ChatGPT generated test page for Trello board assignment and verification. This is not meant for production use and should be removed after testing.

import { useState } from "react";
import { trelloApiFetch } from "../_lib/trelloApi";

export default function LinkTrelloPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch backend connect URL then hand control to Trello auth page.
  const connectTrello = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await trelloApiFetch<{ url?: string }>("/trello/connect-url", {
        method: "GET",
      });
      if (!data.url) throw new Error("Missing Trello authorisation URL.");
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

