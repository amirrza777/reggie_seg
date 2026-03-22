"use client";

import React from "react";
import { formatDate } from "@/shared/lib/formatDate";
import { ArrowRightIcon } from "@/shared/ui/ArrowRightIcon";
import type { TrelloBoardAction } from "../types";

type CardMovementHistoryProps = {
  actionsByDate: Record<string, TrelloBoardAction[]>;
  listNamesById: Record<string, string>;
};

export function CardMovementHistory({ actionsByDate, listNamesById }: CardMovementHistoryProps) {
  const dateKeys = Object.keys(actionsByDate).sort((a, b) => b.localeCompare(a));
  const listName = (id: string) => listNamesById[id] ?? id;

  if (dateKeys.length === 0) return null;

  return (
    <section className="stack trello-history">
      <h2 className="trello-history__title">Card movement history</h2>
      <p className="muted trello-history__hint">
        Grouped by date. Max 500 actions fetched from Trello.
      </p>
      <div className="trello-history__table-wrap">
        <table className="trello-history__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Summary</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {dateKeys.map((dateKey) => {
              const dayActions = actionsByDate[dateKey];
              const created = dayActions.filter((a) => a.type === "createCard");
              const moved = dayActions.filter(
                (a) => a.type === "updateCard" && a.data?.listBefore && a.data?.listAfter
              );
              const summary: string[] = [];
              if (created.length) summary.push(`${created.length} created`);
              if (moved.length) summary.push(`${moved.length} moved`);
              return (
                <tr key={dateKey}>
                  <td>{formatDate(dateKey)}</td>
                  <td>{summary.join(", ")}</td>
                  <td>
                    <ul className="trello-history__details">
                      {created.map((a) => (
                        <li key={a.id}>
                          <strong>{a.data?.card?.name ?? "Card"}</strong>
                          {" created in "}
                          {listName(a.data?.list?.id ?? "")}
                        </li>
                      ))}
                      {moved.map((a) => (
                        <li key={a.id}>
                          <strong>{a.data?.card?.name ?? "Card"}</strong>
                          {" "}
                          <ArrowRightIcon />
                          {" "}
                          {listName(a.data?.listBefore?.id ?? "")}
                          {" "}
                          <ArrowRightIcon />
                          {" "}
                          {listName(a.data?.listAfter?.id ?? "")}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
