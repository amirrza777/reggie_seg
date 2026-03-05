"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TrelloBoardAction, TrelloCard } from "../types";
import { formatDate } from "@/shared/lib/formatDate";

const BACKLOG_NAME = "backlog";
const COMPLETED_NAME = "completed";

function getStatus(listName: string): "backlog" | "inProgress" | "completed" {
  const lower = listName.toLowerCase();
  if (lower === BACKLOG_NAME) return "backlog";
  if (lower === COMPLETED_NAME) return "completed";
  return "inProgress";
}

type CardDistributionGraphProps = {
  actionsByDate: Record<string, TrelloBoardAction[]>;
  listNamesById: Record<string, string>;
  cardsByList: Record<string, TrelloCard[]>;
  memberIdFilter?: string; /** when set, only cards assigned to this trello member id are included. */
  title?: string;
};

type DataPoint = {
  date: string;
  backlog: number;
  inProgress: number;
  completed: number;
};


function buildCurrentState(cardsByList: Record<string, TrelloCard[]>): Record<string, string> {
  const state: Record<string, string> = {};
  for (const [listId, cards] of Object.entries(cardsByList)) {
    for (const card of cards) {
      state[card.id] = listId;
    }
  }
  return state;
}

/* Count each card exactly once by starting from current state and tracing back history */
function computeCountsAtDate(
  dateKey: string,
  allActionsDesc: TrelloBoardAction[],
  currentState: Record<string, string>,
  listNamesById: Record<string, string>
): { backlog: number; inProgress: number; completed: number } {
  const cutoffEnd = new Date(dateKey + "T23:59:59.999Z").getTime();
  const state = { ...currentState };

  for (const action of allActionsDesc) {
    const actionTime = new Date(action.date).getTime();
    if (actionTime <= cutoffEnd) break;

    const cardId = action.data?.card?.id;
    if (!cardId) continue;

    if (action.type === "createCard") {
      delete state[cardId];
    } else if (
      action.type === "updateCard" &&
      action.data?.listBefore?.id
    ) {
      state[cardId] = action.data.listBefore.id;
    }
  }

  let backlog = 0;
  let inProgress = 0;
  let completed = 0;
  for (const listId of Object.values(state)) {
    const listName = listNamesById[listId] ?? "";
    switch (getStatus(listName)) {
      case "backlog":
        backlog++;
        break;
      case "completed":
        completed++;
        break;
      default:
        inProgress++;
    }
  }
  return { backlog, inProgress, completed };
}

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
    if (filtered.length > 0) out[listId] = filtered;
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

export function CardDistributionGraph({
  actionsByDate,
  listNamesById,
  cardsByList,
  memberIdFilter,
  title = "Card distribution over time",
}: CardDistributionGraphProps) {
  const data = useMemo<DataPoint[]>(() => {
    const filteredCardsByList = memberIdFilter
      ? filterCardsByMember(cardsByList, memberIdFilter)
      : cardsByList;
    const cardIds = new Set<string>();
    for (const cards of Object.values(filteredCardsByList)) {
      for (const c of cards) cardIds.add(c.id);
    }
    const filteredActionsByDate =
      memberIdFilter && cardIds.size > 0
        ? filterActionsByCardIds(actionsByDate, cardIds)
        : actionsByDate;

    const currentState = buildCurrentState(filteredCardsByList);
    const allActions = Object.entries(filteredActionsByDate).flatMap(([, actions]) => actions);
    const allActionsDesc = [...allActions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const dateKeys = Object.keys(actionsByDate).sort((a, b) => a.localeCompare(b));
    if (dateKeys.length === 0) return [];

    return dateKeys.map((dateKey) => {
      const { backlog, inProgress, completed } = computeCountsAtDate(
        dateKey,
        allActionsDesc,
        currentState,
        listNamesById
      );
      return {
        date: formatDate(dateKey),
        backlog,
        inProgress,
        completed,
      };
    });
  }, [actionsByDate, listNamesById, cardsByList, memberIdFilter]);

  const hasFilteredCards = useMemo(() => {
    if (!memberIdFilter) return true;
    for (const cards of Object.values(cardsByList)) {
      if (cards.some((c) => isCardAssignedToMember(c, memberIdFilter))) return true;
    }
    return false;
  }, [cardsByList, memberIdFilter]);

  if (data.length === 0) return null;
  if (memberIdFilter && !hasFilteredCards) return null;

  return (
    <section className="stack trello-chart">
      <h2 className="trello-chart__title">{title}</h2>
      <div className="trello-chart__surface">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "var(--shadow-sm)",
                color: "var(--ink)",
                padding: "8px 10px",
              }}
              cursor={{
                stroke: "color-mix(in srgb, var(--muted) 40%, transparent)",
                strokeWidth: 1,
              }}
              labelStyle={{
                color: "var(--muted)",
                fontWeight: 600,
                marginBottom: 6,
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="backlog" stroke="#0079bf" name="Backlog" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="inProgress" stroke="#f2d600" name="In progress" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="completed" stroke="#61bd4f" name="Completed" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
