"use client";

//ChatGPT generated test page for Trello board assignment and verification. This is not meant for production use and should be removed after testing.

import { useEffect, useState } from "react";
import { trelloApiFetch } from "../_lib/trelloApi";

type OwnerBoard = {
  id: string;
  name: string;
};

type TeamBoard = {
  id: string;
  name: string;
  url?: string;
};

export default function AssignBoardPage() {
  const [teamId, setTeamId] = useState("");
  const [boards, setBoards] = useState<OwnerBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [teamBoard, setTeamBoard] = useState<TeamBoard | null>(null);

  useEffect(() => {
    // Load selectable boards from the currently linked Trello account.
    const loadOwnerBoards = async () => {
      try {
        const data = await trelloApiFetch<OwnerBoard[]>("/trello/boards", {
          method: "GET",
        });
        const list = Array.isArray(data) ? data : [];
        setBoards(list);
        if (list.length > 0) setSelectedBoardId(list[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load your boards.");
      }
    };

    void loadOwnerBoards();
  }, []);

  // Assign selected board to team, then immediately verify by fetching team board.
  const assignBoard = async () => {
    const normalizedTeamId = Number(teamId);
    if (!normalizedTeamId || !selectedBoardId) {
      setError("Enter a valid team ID and choose a board.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setTeamBoard(null);

    try {
      await trelloApiFetch<{ message: string }>("/trello/assign", {
        method: "POST",
        body: JSON.stringify({ teamId: normalizedTeamId, boardId: selectedBoardId }),
      });

      const board = await trelloApiFetch<TeamBoard>(
        `/trello/team-board?teamId=${encodeURIComponent(String(normalizedTeamId))}`,
        { method: "GET" }
      );
      setTeamBoard(board);
      setMessage("Board assigned to team and fetched successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign board.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Assign Trello Board To Team</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <input
          type="number"
          min={1}
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="Team ID"
          style={{ padding: "8px 10px", border: "1px solid #d0d5dd", borderRadius: 4 }}
        />
        <select
          value={selectedBoardId}
          onChange={(e) => setSelectedBoardId(e.target.value)}
          style={{ padding: "8px 10px", border: "1px solid #d0d5dd", borderRadius: 4, minWidth: 260 }}
        >
          {boards.length === 0 ? <option value="">No boards available</option> : null}
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
        <button
          onClick={assignBoard}
          disabled={loading || boards.length === 0}
          style={{
            padding: "8px 16px",
            fontSize: 16,
            backgroundColor: "#1d4ed8",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Assigning..." : "Assign Board"}
        </button>
      </div>

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
      {message ? <p style={{ color: "#027a48" }}>{message}</p> : null}

      {teamBoard ? (
        <div style={{ marginTop: 12 }}>
          <strong>Team board:</strong> {teamBoard.name}{" "}
          {teamBoard.url ? (
            <a href={teamBoard.url} target="_blank" rel="noreferrer">
              (Open in Trello)
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

