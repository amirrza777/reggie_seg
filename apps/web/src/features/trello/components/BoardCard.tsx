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
    <li style={{ marginBottom: 8 }}>
      <Card title={card.name}>
        {card.desc ? <p className="lede">{card.desc}</p> : null}

        {(card.labels?.length ?? 0) > 0 ? (
          <div className="pill-nav" style={{ marginBottom: 8 }}>
            {(card.labels ?? []).map((label) => (
              <span key={label.id}>{label.name || "Label"}</span>
            ))}
          </div>
        ) : null}

        <div className="pill-nav">
          {card.due ? <span title="Due">Due {formatDate(card.due)}</span> : null}
          {card.dateLastActivity ? (
            <span title="Last activity">Updated {formatDate(card.dateLastActivity)}</span>
          ) : null}
          {members.length > 0 ? (
            <span className="pill-nav">
              {members.map((m) => (
                <span
                  key={m.id}
                  title={m.fullName}
                  className="eyebrow"
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
