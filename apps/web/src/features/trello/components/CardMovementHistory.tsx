"use client";

import React, { useEffect, useRef } from "react";
import { formatDate } from "@/shared/lib/formatDate";
import type { TrelloBoardAction } from "../types";

type CardMovementHistoryProps = {
  actionsByDate: Record<string, TrelloBoardAction[]>;
  listNamesById: Record<string, string>;
  dateKeysSorted: string[];
  selectedDate: string | "current";
};

export function CardMovementHistory({
  actionsByDate,
  listNamesById,
  dateKeysSorted,
  selectedDate,
}: CardMovementHistoryProps) {
  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate === "current") return;
    const row = selectedRowRef.current;
    const container = tableWrapRef.current;
    if (!row || !container) return;
    const rowRect = row.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (rowRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - rowRect.top;
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollTop += rowRect.bottom - containerRect.bottom;
    }
  }, [selectedDate]);

  const listName = (id: string) => listNamesById[id] ?? id;
  const dateKeysNewestFirst = [...dateKeysSorted].reverse();

  if (dateKeysNewestFirst.length === 0) return null;

  return (
    <section className="stack trello-history">
      <h2 className="trello-history__title">Card movement history</h2>
      <p className="muted trello-history__hint">
        Grouped by date. Max 500 actions fetched from Trello.
      </p>
      <div className="trello-history__table-wrap" ref={tableWrapRef}>
        <table className="trello-history__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Summary</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {dateKeysNewestFirst.map((dateKey) => {
              const dayActions = actionsByDate[dateKey];
              const created = dayActions?.filter((a) => a.type === "createCard") ?? [];
              const moved =
                dayActions?.filter(
                  (a) => a.type === "updateCard" && a.data?.listBefore && a.data?.listAfter
                ) ?? [];
              const summary: string[] = [];
              if (created.length) summary.push(`${created.length} created`);
              if (moved.length) summary.push(`${moved.length} moved`);
              const isSelected = selectedDate !== "current" && selectedDate === dateKey;
              return (
                <tr
                  key={dateKey}
                  ref={isSelected ? selectedRowRef : undefined}
                  className={isSelected ? "trello-history__row trello-history__row--selected" : "trello-history__row"}
                >
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
                          {" → "}
                          {listName(a.data?.listBefore?.id ?? "")} → {listName(a.data?.listAfter?.id ?? "")}
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
