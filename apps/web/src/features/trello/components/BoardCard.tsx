"use client";

import React from "react";
import { formatDate } from "@/shared/lib/formatDate";
import { Card } from "@/shared/ui/Card";
import type { TrelloCard, TrelloMember } from "../types";

type BoardCardProps = {
  card: TrelloCard;
  members: TrelloMember[];
};

export function BoardCard({ card, members }: BoardCardProps) {
  return (
    <li className="trello-card">
      <Card title={card.name} className="trello-card__surface" bodyClassName="trello-card__body">
        {card.desc ? <p className="lede">{card.desc}</p> : null}

        {(card.labels?.length ?? 0) > 0 ? (
          <div className="trello-card__labels">
            {(card.labels ?? []).map((label) => (
              <span key={label.id} className="trello-card__label-chip">{label.name || "Label"}</span>
            ))}
          </div>
        ) : null}

        <div className="trello-card__meta">
          {card.due ? <span className="trello-card__meta-chip" title="Due">Due {formatDate(card.due)}</span> : null}
          {card.dateLastActivity ? (
            <span className="trello-card__meta-chip" title="Last activity">Updated {formatDate(card.dateLastActivity)}</span>
          ) : null}
          {members.length > 0 ? (
            <span className="trello-card__members">
              {members.map((m) => (
                <span
                  key={m.id}
                  title={m.fullName}
                  className="trello-card__member-chip"
                >
                  {m.initials ?? m.fullName.slice(0, 2)}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </Card>
    </li>
  );
}
