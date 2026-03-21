"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { assignBoardToTeam, getBoardById, getMyBoards } from "@/features/trello/api/client";
import type { BoardView, OwnerBoard } from "@/features/trello/api/client";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { Card } from "@/shared/ui/Card";
import { SearchField } from "@/shared/ui/SearchField";
import "@/features/trello/styles/link-board.css";

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
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [availableBoards, setAvailableBoards] = useState<OwnerBoard[]>(boards);
  const [isSearchingBoards, setIsSearchingBoards] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardView | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const visibleBoards = useMemo(() => {
    const selectedBoard = availableBoards.find((board) => board.id === selectedBoardId) ?? boards.find((board) => board.id === selectedBoardId) ?? null;
    if (!selectedBoard) return availableBoards;
    if (availableBoards.some((board) => board.id === selectedBoard.id)) return availableBoards;
    return [selectedBoard, ...availableBoards];
  }, [availableBoards, boards, selectedBoardId]);

  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) setSelectedBoardId(boards[0].id);
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (boardSearchQuery.trim().length > 0) {
      return;
    }
    setAvailableBoards(boards);
  }, [boardSearchQuery, boards]);

  useEffect(() => {
    const normalizedQuery = boardSearchQuery.trim();
    if (!normalizedQuery) {
      setIsSearchingBoards(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsSearchingBoards(true);
      getMyBoards({ query: normalizedQuery })
        .then((nextBoards) => {
          if (cancelled) return;
          setAvailableBoards(nextBoards);
        })
        .catch(() => {
          if (cancelled) return;
          setAvailableBoards([]);
        })
        .finally(() => {
          if (cancelled) return;
          setIsSearchingBoards(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [boardSearchQuery]);

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
    <section className="trello-link-board">
      <header className="trello-link-board__header">
        <h1 className="trello-link-board__title">Link a Trello board</h1>
        <p className="trello-link-board__subtitle">
          {teamName ? `Choose a board to link to ${teamName}.` : "Choose a board to link to this team."}
        </p>
      </header>

      <div className="trello-link-board__controls">
        <label className="trello-link-board__select-wrap">
          <span className="trello-link-board__select-label">BOARD</span>
          <SearchField
            value={boardSearchQuery}
            onChange={(event) => setBoardSearchQuery(event.target.value)}
            className="trello-link-board__select"
            placeholder="Search boards by name or ID"
            aria-label="Search Trello boards"
            disabled={boards.length === 0 && boardSearchQuery.trim().length === 0}
          />
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="trello-link-board__select"
            aria-label="Select Trello board"
          >
            {boards.length === 0 ? (
              <option value="">No boards available</option>
            ) : isSearchingBoards ? (
              <option value="">Searching boards...</option>
            ) : visibleBoards.length === 0 ? (
              <option value="">No boards match "{boardSearchQuery.trim()}"</option>
            ) : (
              visibleBoards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--primary trello-link-board__action"
          onClick={assign}
          disabled={loading || boards.length === 0}
        >
          {loading ? "Linking…" : "Link board"}
        </button>
      </div>

      {previewLoading ? (
        <p className="muted">Loading board preview…</p>
      ) : preview ? (
        <section className="trello-link-board__preview">
          <div className="trello-link-board__preview-header">
            <h3 className="trello-link-board__preview-title">Preview</h3>
            {preview.board.members && preview.board.members.length > 0 ? (
              <p className="trello-link-board__preview-members">
                <strong>Members ({preview.board.members.length}):</strong>{" "}
                {preview.board.members.map((m) => m.fullName || m.initials || m.id).join(", ")}
              </p>
            ) : null}
          </div>
          <div className="trello-link-board__lists">
            {(preview.board.lists ?? []).map((list) => {
              const allCards = preview.cardsByList[list.id] ?? [];
              const cards = allCards.slice(0, MAX_PREVIEW_CARDS_PER_LIST);
              return (
                <div key={list.id} className="trello-link-board__list">
                  <Card title={list.name}>
                    {cards.length === 0 ? (
                      <p className="muted">No cards</p>
                    ) : (
                      <>
                        <ul className="stack trello-link-board__cards">
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
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="trello-link-board__error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
