"use client";

//ChatGPT generated test page for Trello board assignment and verification. This is not meant for production use and should be removed after testing.

import Link from "next/link";
import { useEffect, useState } from "react";
import { trelloApiFetch } from "./_lib/trelloApi";


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
    // Initial load of boards for quick sanity-check after linking.
    const loadBoards = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await trelloApiFetch<TrelloBoard[]>("/trello/boards", {
          method: "GET",
        });
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
  const goToTeamBoardPage = () => {
    window.location.href = "/trello-test/team-board";
  };
  const goToAssignBoardPage = () => {
    window.location.href = "/trello-test/assign-board";
  };

  const refreshBoards = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await trelloApiFetch<TrelloBoard[]>("/trello/boards", {
        method: "GET",
      });
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
      <button
        onClick={goToTeamBoardPage}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          backgroundColor: "#0f766e",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          marginLeft: 8,
          opacity: loading ? 0.6 : 1,
        }}
        disabled={loading}
      >
        View Team Board
      </button>
      <button
        onClick={goToAssignBoardPage}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          backgroundColor: "#1d4ed8",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          marginLeft: 8,
          opacity: loading ? 0.6 : 1,
        }}
        disabled={loading}
      >
        Assign Team Board
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
              <Link href={`/trello-test/boards/${board.id}`}>
                {board.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

