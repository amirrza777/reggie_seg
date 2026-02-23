"use client";

import React from "react";
import { BoardCard } from "./BoardCard";
import type { TrelloCard, TrelloList } from "../types";

type BoardListSectionProps = {
  list: TrelloList;
  cards: TrelloCard[];
};

export function BoardListSection({ list, cards }: BoardListSectionProps) {
  return (
    <div
      style={{
        flex: "0 0 280px",
        backgroundColor: "#f4f5f7",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <h3>{list.name}</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {cards.map((card) => (
          <BoardCard key={card.id} card={card} members={card.members ?? []} />
        ))}
      </ul>
    </div>
  );
}
