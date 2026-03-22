"use client";

import { BoardListSection } from "@/features/trello/components/BoardListSection";
import "@/features/trello/styles/board-view.css";
import { CardMovementHistory } from "@/features/trello/components/CardMovementHistory";
import type { BoardView } from "@/features/trello/api/client";
import React from "react";

type Props = {
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
};

export function TrelloBoardView({
  view,
  sectionConfig,
}: Props) {
  const { cardsByList, listNamesById, actionsByDate } = view;
  const lists = view.board.lists ?? [];

  return (
    <div className="stack">
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8,
          minHeight: 0,
        }}
      >
        {lists.map((list) => (
          <div key={list.id} style={{ flex: "0 0 280px", minWidth: 280 }}>
            <BoardListSection
              list={list}
              cards={cardsByList[list.id] ?? []}
              sectionStatus={sectionConfig[list.name]}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <CardMovementHistory actionsByDate={actionsByDate} listNamesById={listNamesById} />
      </div>
    </div>
  );
}
