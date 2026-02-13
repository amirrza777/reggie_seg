"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/shared/api/env";
import { getAccessToken } from "@/features/auth/api/session";

type TrelloBoard = {
  id: string;
  name: string;
  url: string;
};

export default function TrelloBoardsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<TrelloBoard[]>([]);

  useEffect(() => {
    const loadBoards = async () => {
      const token = getAccessToken();
      if (!token) {
        setError("You must be logged in before loading Trello boards.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/trello/owner-boards`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load Trello boards.");
        }

        const data = (await res.json()) as TrelloBoard[];
        setBoards(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Trello boards.");
      } finally {
        setLoading(false);
      }
    };

    void loadBoards();
  }, []);

  const goToLinkPage = () => {
    window.location.href = "/trello-test/link-trello";
  };

  const refreshBoards = async () => {
    const token = getAccessToken();
    if (!token) {
      setError("You must be logged in before loading Trello boards.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/trello/owner-boards`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load Trello boards.");
      }

      const data = (await res.json()) as TrelloBoard[];
      setBoards(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load Trello boards.");
      return;
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Trello Boards</h1>
      <button
        onClick={goToLinkPage}
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
        Link Trello Account
      </button>
      <button
        onClick={refreshBoards}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          backgroundColor: "#172B4D",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          marginLeft: 8,
          opacity: loading ? 0.6 : 1,
        }}
        disabled={loading}
      >
        {loading ? "Loading..." : "Refresh Boards"}
      </button>
      {error ? <p style={{ color: "#b42318", marginTop: 12 }}>{error}</p> : null}
      {!loading && !error && boards.length === 0 ? (
        <p style={{ marginTop: 12 }}>
          No boards loaded. Link your Trello account, then refresh.
        </p>
      ) : null}
      {boards.length > 0 ? (
        <ul style={{ marginTop: 16 }}>
          {boards.map((board) => (
            <li key={board.id} style={{ marginBottom: 8 }}>
              <a href={board.url} target="_blank" rel="noreferrer">
                {board.name}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
