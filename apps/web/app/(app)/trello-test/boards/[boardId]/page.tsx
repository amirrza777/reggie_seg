"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getBoardById } from "@/features/trello/api/client";
import { BoardListSection } from "@/features/trello/components/BoardListSection";
import { CardMovementHistory } from "@/features/trello/components/CardMovementHistory";
import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";

export default function TrelloBoardViewPage() {
  const params = useParams();
  const boardId = params?.boardId as string | undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<Awaited<ReturnType<typeof getBoardById>> | null>(null);

  useEffect(() => {
    if (!boardId) {
      setError("Missing board ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getBoardById(boardId)
      .then(setView)
      .catch((err) => {
        setError(
          "Failed to load board."
        );
      })
      .finally(() => setLoading(false));
  }, [boardId]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading board…</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#b42318" }}>{error ?? "Board not found."}</p>
        <Link href="/trello-test" style={{ marginTop: 12, display: "inline-block" }}>
          ← Back to Trello boards
        </Link>
      </div>
    );
  }

  const { board, cardsByList, listNamesById, actionsByDate } = view;
  const lists = board.lists ?? [];

  return (
    <div style={{ padding: 24, maxWidth: "100vw", overflowX: "hidden" }}>
      <Link href="/trello-test">← Back to Trello boards</Link>
      <h1>{board.name}</h1>
      {board.url ? (
        <Link href={board.url} target="_blank" rel="noreferrer">
          Open in Trello
        </Link>
      ) : null}

      <div
        style={{
          marginTop: 24,
          overflowX: "auto",
          width: "100%",
          minWidth: 0,
          paddingBottom: 8,
        }}
      >
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

      <CardDistributionGraph actionsByDate={actionsByDate} listNamesById={listNamesById} cardsByList={cardsByList} />
    </div>
  );
}
