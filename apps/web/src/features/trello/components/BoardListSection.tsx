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
    <section className="trello-lane">
      <header className="trello-lane__header">
        <h3 className="trello-lane__title">{list.name}</h3>
        <span className="trello-lane__count">{cards.length}</span>
      </header>
      <ul className="trello-lane__cards">
        {cards.map((card) => (
          <BoardCard key={card.id} card={card} members={card.members ?? []} />
        ))}
      </ul>
      {cards.length === 0 ? <p className="trello-lane__empty">No cards</p> : null}
    </section>
  );
}
