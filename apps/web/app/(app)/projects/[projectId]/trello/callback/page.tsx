"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { completeTrelloLinkWithToken } from "@/features/trello/api/client";

function readTokenFromHash(hash: string): string | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(value);
  return params.get("token");
}

export default function ProjectTrelloCallbackPage() {
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : "";
  const projectTrelloHref = projectId ? `/projects/${encodeURIComponent(projectId)}/trello` : "/dashboard";

  const [status, setStatus] = useState(() => {
    if (typeof window === "undefined") {
      return "Finishing Trello connection...";
    }
    return readTokenFromHash(window.location.hash)
      ? "Finishing Trello connection..."
      : "Trello did not return a token. Try connecting again.";
  });

  useEffect(() => {
    const token = readTokenFromHash(window.location.hash);

    if (!token) {
      return;
    }

    const run = async () => {
      try {
        const linkToken = sessionStorage.getItem("trello.linkToken");
        sessionStorage.removeItem("trello.linkToken");
        if (!linkToken) {
          setStatus("Link expired or missing. Start again from your project Trello page.");
          return;
        }
        await completeTrelloLinkWithToken(linkToken, token);

        setStatus("Trello connected. Redirecting...");
        window.setTimeout(() => {
          try {
            const returnTo = sessionStorage.getItem("trello.returnTo");
            sessionStorage.removeItem("trello.returnTo");
            const safe =
              returnTo && returnTo.startsWith("/") ? returnTo : projectTrelloHref;
            window.location.href = safe;
          } catch {
            window.location.href = projectTrelloHref;
          }
        }, 800);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to complete Trello connection.");
      }
    };

    void run();
  }, [projectTrelloHref]);

  return (
    <div>
      <h1>Trello</h1>
      <p>{status}</p>
    </div>
  );
}
