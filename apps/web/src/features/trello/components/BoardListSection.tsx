"use client";

import React from "react";
import { BoardCard } from "./BoardCard";
import type { TrelloCard, TrelloList } from "../types";
import { SECTION_STATUS_LABELS } from "../lib/listStatus";

type BoardListSectionProps = {
  list: TrelloList;
  cards: TrelloCard[];
  sectionStatus?: string;
};

export function BoardListSection({ list, cards, sectionStatus }: BoardListSectionProps) {
  const statusLabel = sectionStatus ? (SECTION_STATUS_LABELS[sectionStatus] ?? sectionStatus) : null;

  return (
    <div
      style={{
        flex: "0 0 280px",
        backgroundColor: "#f4f5f7",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <h3 style={{ margin: 0 }}>{list.name}</h3>
      {statusLabel ? (
        <p className="muted eyebrow">{statusLabel}</p>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {cards.map((card) => (
          <BoardCard key={card.id} card={card} members={card.members ?? []} />
        ))}
      </ul>
    </div>
  );
}
