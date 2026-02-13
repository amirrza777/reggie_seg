"use client";

//ChatGPT generated test page for Trello board assignment and verification. This is not meant for production use and should be removed after testing.

import { useEffect, useState } from "react";
import { trelloApiFetch } from "../_lib/trelloApi";

function readTokenFromHash(hash: string): string | null {
  // Trello returns token in URL fragment, not query params.
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(value);
  return params.get("token");
}

export default function TrelloCallbackPage() {
  const [status, setStatus] = useState("Finishing Trello connection...");

  useEffect(() => {
    const token = readTokenFromHash(window.location.hash);

    if (!token) {
      setStatus("Trello did not return a token. Try connecting again.");
      return;
    }

    const run = async () => {
      try {
        await trelloApiFetch<{ ok: boolean }>("/trello/callback", {
          method: "POST",
          body: JSON.stringify({ token }),
        });

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

