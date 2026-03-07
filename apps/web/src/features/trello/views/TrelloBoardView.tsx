"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyTrelloMemberId } from "@/features/trello/api/client";
import { BoardListSection } from "@/features/trello/components/BoardListSection";
import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";
import { CardMovementHistory } from "@/features/trello/components/CardMovementHistory";
import type { BoardView } from "@/features/trello/api/client";
import "@/features/trello/styles/board-view.css";
type Props = {
  view: BoardView;
  onRequestChangeBoard: () => void;
};

export function TrelloBoardView({ view, onRequestChangeBoard }: Props) {
  const { board, cardsByList, listNamesById, actionsByDate } = view;
  const lists = board.lists ?? [];

  const [confirmingChange, setConfirmingChange] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [myTrelloMemberId, setMyTrelloMemberId] = useState<string | null>(null);

  useEffect(() => {
    getMyTrelloMemberId()
      .then((res) => setMyTrelloMemberId(res.trelloMemberId ?? null))
      .catch(() => setMyTrelloMemberId(null));
  }, []);

  const handleConfirmChange = async () => {
    setLoadingBoards(true);
    try {
      await onRequestChangeBoard();
    } finally {
      setLoadingBoards(false);
      setConfirmingChange(false);
    }
  };

  return (
    <section className="trello-board">
      <div className="trello-board__top">
        <div className="trello-board__header">
          <h1 className="trello-board__title">{board.name}</h1>
          <div className="trello-board__actions">
            {board.url ? (
              <Link href={board.url} target="_blank" rel="noreferrer" className="trello-board__open-link">
                Open in Trello
              </Link>
            ) : null}
            {!confirmingChange ? (
              <button type="button" onClick={() => setConfirmingChange(true)} className="btn btn--ghost">
                Change linked board
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {confirmingChange ? (
        <div className="trello-board__confirm">
          <p className="trello-board__confirm-title">Change the team&apos;s linked board?</p>
          <p className="muted trello-board__confirm-text">
            The current board will be unlinked from this team. You can then choose a different board from your Trello account.
          </p>
          <div className="trello-board__confirm-actions">
            <button
              type="button"
              onClick={() => setConfirmingChange(false)}
              disabled={loadingBoards}
              className="btn btn--ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmChange}
              disabled={loadingBoards}
              className="btn btn--primary"
            >
              {loadingBoards ? "Loading…" : "Yes, change board"}
            </button>
          </div>
        </div>
      ) : null}

      <section className="trello-board__lanes" aria-label="Trello lists">
        {lists.map((list) => (
          <BoardListSection
            key={list.id}
            list={list}
            cards={cardsByList[list.id] ?? []}
          />
        ))}
      </section>

      <CardMovementHistory actionsByDate={actionsByDate} listNamesById={listNamesById} />
      <CardDistributionGraph
        actionsByDate={actionsByDate}
        listNamesById={listNamesById}
        cardsByList={cardsByList}
      />
      {myTrelloMemberId ? (
        <CardDistributionGraph
          actionsByDate={actionsByDate}
          listNamesById={listNamesById}
          cardsByList={cardsByList}
          memberIdFilter={myTrelloMemberId}
          title="Your card distribution"
        />
      ) : null}
    </section>
  );
}
