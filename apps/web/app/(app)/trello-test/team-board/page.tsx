"use client";

//ChatGPT generated test page for Trello board assignment and verification. This is not meant for production use and should be removed after testing.

import { useMemo, useState } from "react";
import { trelloApiFetch } from "../_lib/trelloApi";

type TrelloCard = {
  id: string;
  idList: string;
  name: string;
  shortUrl?: string;
};

type TrelloList = {
  id: string;
  name: string;
};

type TrelloBoardDetails = {
  id: string;
  name: string;
  url?: string;
  lists?: TrelloList[];
  cards?: TrelloCard[];
};

export default function TeamBoardPage() {
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<TrelloBoardDetails | null>(null);

  // Group cards by list so rendering matches Trello column layout.
  const cardsByListId = useMemo(() => {
    const map = new Map<string, TrelloCard[]>();
    for (const card of board?.cards ?? []) {
      const current = map.get(card.idList) ?? [];
      current.push(card);
      map.set(card.idList, current);
    }
    return map;
  }, [board]);

  const loadTeamBoard = async () => {
    const normalizedTeamId = teamId.trim();
    if (!normalizedTeamId) {
      setError("Enter a team ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await trelloApiFetch<TrelloBoardDetails>(`/trello/team-board?teamId=${encodeURIComponent(normalizedTeamId)}`, {
        method: "GET",
      });
      setBoard(data);
    } catch (err) {
      setBoard(null);
      setError(err instanceof Error ? err.message : "Failed to load team board.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Team Trello Board</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="number"
          min={1}
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="Team ID"
          style={{ padding: "8px 10px", border: "1px solid #d0d5dd", borderRadius: 4 }}
        />
        <button
          onClick={loadTeamBoard}
          disabled={loading}
          style={{
            padding: "8px 16px",
            fontSize: 16,
            backgroundColor: "#172B4D",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Load Team Board"}
        </button>
      </div>

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

      {board ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 6 }}>{board.name}</h2>
          {board.url ? (
            <p style={{ marginTop: 0 }}>
              <a href={board.url} target="_blank" rel="noreferrer">
                Open in Trello
              </a>
            </p>
          ) : null}

          {(board.lists ?? []).map((list) => {
            const cards = cardsByListId.get(list.id) ?? [];
            return (
              <div key={list.id} style={{ marginTop: 14, padding: 12, border: "1px solid #e4e7ec", borderRadius: 6 }}>
                <h3 style={{ margin: "0 0 8px 0" }}>{list.name}</h3>
                {cards.length === 0 ? (
                  <p style={{ margin: 0, color: "#667085" }}>No open cards.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {cards.map((card) => (
                      <li key={card.id} style={{ marginBottom: 6 }}>
                        {card.shortUrl ? (
                          <a href={card.shortUrl} target="_blank" rel="noreferrer">
                            {card.name}
                          </a>
                        ) : (
                          card.name
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

