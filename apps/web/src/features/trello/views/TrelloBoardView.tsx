"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyBoards, getMyTrelloMemberId } from "@/features/trello/api/client";
import { BoardListSection } from "@/features/trello/components/BoardListSection";
import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";
import { CardMovementHistory } from "@/features/trello/components/CardMovementHistory";
import type { BoardView } from "@/features/trello/api/client";
type Props = {
  projectId: string;
  view: BoardView;
  onRequestChangeBoard: () => void;
};

export function TrelloBoardView({ projectId, view, onRequestChangeBoard }: Props) {
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
    <div>
      <Link href={`/projects/${projectId}`}>← Back to project</Link>
      <div>
        <h1>{board.name}</h1>
        <br />
        {board.url ? (
          <Link href={board.url} target="_blank" rel="noreferrer" className="btn btn--primary">
            Open in Trello
          </Link>
        ) : null}
        {!confirmingChange ? (
          <button type="button" onClick={() => setConfirmingChange(true)} className="btn btn--ghost">
            Change linked board
          </button>
        ) : null}
      </div>

      {confirmingChange ? (
        <div>
          <p>Change the team&apos;s linked board?</p>
          <p>
            The current board will be unlinked from this team. You can then choose a different board from your Trello account.
          </p>
          <div>
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

      <div>
        <div style={{ display: "flex", gap: 16, width: "fit-content" }}>
          {lists.map((list) => (
            <BoardListSection
              key={list.id}
              list={list}
              cards={cardsByList[list.id] ?? []}
            />
          ))}
        </div>
      </div>

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
    </div>
  );
}
