"use client";

import { useEffect, useState } from "react";
import { completeTrelloLinkWithToken } from "@/features/trello/api/client";

function readTokenFromHash(hash: string): string | null {
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
        const linkToken = sessionStorage.getItem("trello.linkToken");
        sessionStorage.removeItem("trello.linkToken");
        if (!linkToken) {
          setStatus("Link expired or missing. Start again from the project Trello page.");
          return;
        }
        await completeTrelloLinkWithToken(linkToken, token);

        setStatus("Trello connected. Redirecting...");
        window.setTimeout(() => {
          try {
            const returnTo = sessionStorage.getItem("trello.returnTo");
            sessionStorage.removeItem("trello.returnTo");
            window.location.href = returnTo && returnTo.startsWith("/") ? returnTo : "/trello-test";
          } catch {
            window.location.href = "/trello-test";
          }
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

