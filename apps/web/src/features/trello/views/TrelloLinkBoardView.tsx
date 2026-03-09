"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { assignBoardToTeam, getBoardById } from "@/features/trello/api/client";
import type { BoardView, OwnerBoard } from "@/features/trello/api/client";
import { Card } from "@/shared/ui/Card";

const MAX_PREVIEW_CARDS_PER_LIST = 5;

type Props = {
  projectId: string;
  teamId: number;
  teamName?: string;
  boards: OwnerBoard[];
  onAssigned: () => void;
};

export function TrelloLinkBoardView({ projectId, teamId, teamName, boards, onAssigned }: Props) {
  const router = useRouter();
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardView | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) setSelectedBoardId(boards[0].id);
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (!selectedBoardId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreview(null);
    getBoardById(selectedBoardId)
      .then((view) => {
        if (!cancelled) setPreview(view);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBoardId]);

  const assign = async () => {
    if (!selectedBoardId) return;
    setLoading(true);
    setError(null);
    try {
      await assignBoardToTeam(teamId, selectedBoardId);
      onAssigned();
      router.push(`/projects/${projectId}/trello/configure`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign board.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section container">
      <div className="stack">
        <h2>Link a Trello board</h2>
        <p className="lede">
          {teamName ? `Choose a board to link to ${teamName}.` : "Choose a board to link to this team."}
        </p>

        <div className="pill-nav">
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="pill-nav__link"
          >
            {boards.length === 0 ? (
              <option value="">No boards available</option>
            ) : (
              boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            className="btn btn--primary"
            onClick={assign}
            disabled={loading || boards.length === 0}
          >
            {loading ? "Linking…" : "Link board"}
          </button>
        </div>

        {previewLoading ? (
          <p className="muted">Loading board preview…</p>
        ) : preview ? (
          <div className="stack">
            <h3>Preview</h3>
            {preview.board.members && preview.board.members.length > 0 ? (
              <p className="lede">
                <strong>Members ({preview.board.members.length}):</strong>{" "}
                {preview.board.members.map((m) => m.fullName || m.initials || m.id).join(", ")}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                gap: 16,
                overflowX: "auto",
                paddingBottom: 8,
                minWidth: 0,
              }}
            >
              {(preview.board.lists ?? []).map((list) => {
                const allCards = preview.cardsByList[list.id] ?? [];
                const cards = allCards.slice(0, MAX_PREVIEW_CARDS_PER_LIST);
                return (
                  <div key={list.id} style={{ flex: "0 0 280px" }}>
                    <Card title={list.name}>
                      {cards.length === 0 ? (
                        <p className="muted">No cards</p>
                      ) : (
                        <>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
                            {cards.map((card) => (
                              <li key={card.id}>{card.name}</li>
                            ))}
                          </ul>
                          {allCards.length > MAX_PREVIEW_CARDS_PER_LIST ? (
                            <p className="muted">
                              +{allCards.length - MAX_PREVIEW_CARDS_PER_LIST} more
                            </p>
                          ) : null}
                        </>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="muted">
            {error}
          </p>
        ) : null}
        <Link href={`/projects/${projectId}`}>
          ← Back to project
        </Link>
      </div>
    </section>
  );
}
