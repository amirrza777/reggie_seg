"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/shared/api/env";
import { getAccessToken } from "@/features/auth/api/session";

function readTokenFromHash(hash: string): string | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(value);
  return params.get("token");
}

export default function TrelloCallbackPage() {
  const [status, setStatus] = useState("Finishing Trello connection...");

  useEffect(() => {
    const token = readTokenFromHash(window.location.hash);
    const accessToken = getAccessToken();

    if (!accessToken) {
      setStatus("Login is required before connecting Trello.");
      return;
    }

    if (!token) {
      setStatus("Trello did not return a token. Try connecting again.");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/trello/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to save Trello token.");
        }

        setStatus("Trello connected. Redirecting...");
        window.setTimeout(() => {
          window.location.href = "/trello-test";
        }, 800);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to complete Trello connection.");
      }
    };

    void run();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Trello Callback</h1>
      <p>{status}</p>
    </div>
  );
}
