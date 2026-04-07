"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BoardListSection } from "@/features/trello/components/BoardListSection";
import "@/features/trello/styles/board-view.css";
import { CardMovementHistory } from "@/features/trello/components/CardMovementHistory";
import { getMyTrelloMemberId } from "@/features/trello/api/client";
import { formatDate } from "@/shared/lib/formatDate";
import {
  getBoardStateAtDate,
  getDateKeysWithActions,
  prevCalendarDay,
  nextCalendarDay,
  prevChangeDay,
  nextChangeDay,
} from "@/features/trello/lib/boardStateAtDate";
import type { BoardView } from "@/features/trello/api/client";
import type { TrelloBoardAction, TrelloCard } from "@/features/trello/types";

type Props = {
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  /** When "staff", show dropdown of all board members (default: "project" = Whole team / My tasks toggle) */
  filterVariant?: "project" | "staff";
};

function isCardAssignedToMember(card: TrelloCard, memberId: string): boolean {
  if (card.members?.some((m) => m.id === memberId)) return true;
  if (card.idMembers?.includes(memberId)) return true;
  return false;
}

function filterCardsByMember(
  cardsByList: Record<string, TrelloCard[]>,
  memberId: string
): Record<string, TrelloCard[]> {
  const out: Record<string, TrelloCard[]> = {};
  for (const [listId, cards] of Object.entries(cardsByList)) {
    const filtered = cards.filter((c) => isCardAssignedToMember(c, memberId));
    out[listId] = filtered;
  }
  return out;
}

function filterActionsByCardIds(
  actionsByDate: Record<string, TrelloBoardAction[]>,
  cardIds: Set<string>
): Record<string, TrelloBoardAction[]> {
  const out: Record<string, TrelloBoardAction[]> = {};
  for (const [dateKey, actions] of Object.entries(actionsByDate)) {
    const filtered = actions.filter((a) => {
      const cardId = a.data?.card?.id;
      return cardId && cardIds.has(cardId);
    });
    if (filtered.length > 0) out[dateKey] = filtered;
  }
  return out;
}

export function TrelloBoardView({
  view,
  sectionConfig,
  filterVariant = "project",
}: Props) {
  const { cardsByList, listNamesById, actionsByDate } = view;
  const lists = view.board.lists ?? [];
  const boardMembers = view.board.members ?? [];

  const [projectFilter, setProjectFilter] = useState<"whole-team" | "my-tasks">("whole-team");
  const [staffMemberId, setStaffMemberId] = useState<string>("");
  const [myTrelloMemberId, setMyTrelloMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (filterVariant !== "project") return;
    getMyTrelloMemberId()
      .then((res) => setMyTrelloMemberId(res.trelloMemberId ?? null))
      .catch(() => setMyTrelloMemberId(null));
  }, [filterVariant]);

  const effectiveMemberId =
    filterVariant === "staff"
      ? staffMemberId || null
      : projectFilter === "my-tasks" && myTrelloMemberId
        ? myTrelloMemberId
        : null;

  const { filteredCardsByList, filteredActionsByDate } = useMemo(() => {
    const cards = effectiveMemberId
      ? filterCardsByMember(cardsByList, effectiveMemberId)
      : cardsByList;
    const cardIds = new Set<string>();
    for (const listCards of Object.values(cards)) {
      for (const c of listCards) cardIds.add(c.id);
    }
    const actions =
      effectiveMemberId && cardIds.size > 0
        ? filterActionsByCardIds(actionsByDate, cardIds)
        : actionsByDate;
    return { filteredCardsByList: cards, filteredActionsByDate: actions };
  }, [effectiveMemberId, cardsByList, actionsByDate]);

  const dateKeysSorted = useMemo(
    () =>
      getDateKeysWithActions(
        effectiveMemberId ? filteredActionsByDate : actionsByDate
      ),
    [effectiveMemberId, filteredActionsByDate, actionsByDate]
  );
  const firstChangeDate = dateKeysSorted[0] ?? "";
  const [selectedDateInput, setSelectedDateInput] = useState<string | "current">("current");
  const selectedDate = useMemo<string | "current">(() => {
    if (dateKeysSorted.length === 0) {
      return "current";
    }
    if (selectedDateInput === "current") {
      return "current";
    }
    return dateKeysSorted.includes(selectedDateInput) ? selectedDateInput : "current";
  }, [dateKeysSorted, selectedDateInput]);

  const cardsToShow = useMemo(() => {
    if (selectedDate === "current") {
      return filteredCardsByList;
    }
    const atDate = getBoardStateAtDate(cardsByList, actionsByDate, selectedDate);
    return effectiveMemberId
      ? filterCardsByMember(atDate, effectiveMemberId)
      : atDate;
  }, [
    selectedDate,
    filteredCardsByList,
    cardsByList,
    actionsByDate,
    effectiveMemberId,
  ]);

  const isCurrent = selectedDate === "current";
  const todayKey = new Date().toISOString().slice(0, 10);
  const innerCanGoEarlier =
    selectedDate === "current"
      ? prevCalendarDay(todayKey, firstChangeDate) !== null
      : firstChangeDate &&
        prevCalendarDay(selectedDate, firstChangeDate) !== null;
  const innerCanGoLater =
    selectedDate !== "current" &&
    (nextCalendarDay(selectedDate) !== null || selectedDate === todayKey);
  const outerCanGoEarlier =
    dateKeysSorted.length > 0 &&
    (selectedDate === "current" || prevChangeDay(selectedDate, dateKeysSorted) !== null);
  const outerCanGoLater =
    selectedDate !== "current" &&
    (dateKeysSorted.length === 0 || nextChangeDay(selectedDate, dateKeysSorted) !== "current");

  const dateLabel = isCurrent
    ? "Current board state"
    : `Board state as of ${formatDate(selectedDate)}`;

  const handleInnerEarlier = () => {
    const from = selectedDate === "current" ? todayKey : selectedDate;
    const prev = prevCalendarDay(from, firstChangeDate);
    if (prev !== null) setSelectedDateInput(prev);
  };
  const handleInnerLater = () => {
    if (selectedDate === "current") return;
    const next = nextCalendarDay(selectedDate);
    if (next !== null && next === todayKey) {
      setSelectedDateInput("current");
    } else if (next !== null) {
      setSelectedDateInput(next);
    } else {
      setSelectedDateInput("current");
    }
  };
  const handleOuterEarlier = () => {
    if (selectedDate === "current" && dateKeysSorted.length > 0) {
      setSelectedDateInput(dateKeysSorted[dateKeysSorted.length - 1]!);
      return;
    }
    if (selectedDate !== "current") {
      const prev = prevChangeDay(selectedDate, dateKeysSorted);
      if (prev !== null) setSelectedDateInput(prev);
    }
  };
  const handleOuterLater = () => {
    if (selectedDate === "current") return;
    const next = nextChangeDay(selectedDate, dateKeysSorted);
    setSelectedDateInput(next);
  };

  return (
    <div className="stack">
      <div className="trello-board-toolbar">
        <div className="trello-board-filter">
          <span className="trello-board-filter__label">Show:</span>
          {filterVariant === "staff" ? (
            <select
              className="trello-board-filter__select"
              value={staffMemberId}
              onChange={(e) => setStaffMemberId(e.target.value)}
              aria-label="Filter by team member"
            >
              <option value="">Whole team</option>
              {boardMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName || m.initials || m.id}
                </option>
              ))}
            </select>
          ) : (
            <nav className="pill-nav" aria-label="Board filter">
              <button
                type="button"
                className={`pill-nav__link ${projectFilter === "whole-team" ? "pill-nav__link--active" : ""}`}
                onClick={() => setProjectFilter("whole-team")}
                aria-pressed={projectFilter === "whole-team"}
              >
                Whole team
              </button>
              <button
                type="button"
                className={`pill-nav__link ${projectFilter === "my-tasks" ? "pill-nav__link--active" : ""}`}
                onClick={() => setProjectFilter("my-tasks")}
                disabled={!myTrelloMemberId}
                aria-pressed={projectFilter === "my-tasks"}
                title={!myTrelloMemberId ? "Link your Trello account in profile to filter by your tasks" : undefined}
              >
                My tasks
              </button>
            </nav>
          )}
        </div>
        {dateKeysSorted.length > 0 ? (
          <div className="trello-board-time" aria-label="Board state over time">
            <button
              type="button"
              className="trello-board-time__arrow trello-board-time__arrow--outer"
              onClick={handleOuterEarlier}
              disabled={!outerCanGoEarlier}
              aria-label="Previous day with changes"
              title="Jump to previous day with changes"
            >
              ‹‹
            </button>
            <button
              type="button"
              className="trello-board-time__arrow"
              onClick={handleInnerEarlier}
              disabled={!innerCanGoEarlier}
              aria-label="Earlier day"
              title="Previous calendar day"
            >
              ←
            </button>
            <span className="trello-board-time__label">{dateLabel}</span>
            <button
              type="button"
              className="trello-board-time__arrow"
              onClick={handleInnerLater}
              disabled={!innerCanGoLater}
              aria-label="Later day"
              title="Next calendar day"
            >
              →
            </button>
            <button
              type="button"
              className="trello-board-time__arrow trello-board-time__arrow--outer"
              onClick={handleOuterLater}
              disabled={!outerCanGoLater}
              aria-label="Next day with changes"
              title="Jump to next day with changes"
            >
              ››
            </button>
          </div>
        ) : null}
      </div>

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
              cards={cardsToShow[list.id] ?? []}
              sectionStatus={sectionConfig[list.name]}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <CardMovementHistory
          actionsByDate={filteredActionsByDate}
          listNamesById={listNamesById}
          dateKeysSorted={dateKeysSorted}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
