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
  ReferenceLine,
} from "recharts";
import type { TrelloBoardAction, TrelloCard } from "../types";
import { formatDate } from "@/shared/lib/formatDate";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";

const BACKLOG_NAME = "backlog";
const COMPLETED_NAME = "completed";

function getStatusFromName(listName: string): "backlog" | "inProgress" | "completed" {
  const lower = listName.toLowerCase();
  if (lower === BACKLOG_NAME) return "backlog";
  if (lower === COMPLETED_NAME) return "completed";
  return "inProgress";
}

function getStatus(
  listName: string,
  sectionConfig?: Record<string, string> | null
): "backlog" | "inProgress" | "completed" | null {
  if (sectionConfig && typeof sectionConfig[listName] === "string") {
    const v = sectionConfig[listName].toLowerCase().replace(/\s+/g, "_");
    if (v === "information_only") return null;
    if (v === "backlog") return "backlog";
    if (v === "work_in_progress" || v === "work in progress") return "inProgress";
    if (v === "completed") return "completed";
  }
  return getStatusFromName(listName);
}

type CardDistributionGraphProps = {
  actionsByDate: Record<string, TrelloBoardAction[]>;
  listNamesById: Record<string, string>;
  cardsByList: Record<string, TrelloCard[]>;
  memberIdFilter?: string; /** when set, only cards assigned to this trello member id are included. */
  sectionConfig?: Record<string, string> | null;
  title?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
};

type DataPoint = {
  date: string;
  dateKey: string;
  time: number;
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
  listNamesById: Record<string, string>,
  sectionConfig?: Record<string, string> | null
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
    const status = getStatus(listName, sectionConfig);
    if (status === null) continue;
    switch (status) {
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
  sectionConfig,
  title = "Card distribution over time",
  projectStartDate,
  projectEndDate,
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
        listNamesById,
        sectionConfig
      );
      return {
        date: formatDate(dateKey),
        dateKey,
        time: new Date(dateKey + "T12:00:00Z").getTime(),
        backlog,
        inProgress,
        completed,
      };
    });
  }, [actionsByDate, listNamesById, cardsByList, memberIdFilter, sectionConfig]);

  const projectStartTime = useMemo(
    () => (projectStartDate ? new Date(projectStartDate + "T12:00:00Z").getTime() : null),
    [projectStartDate]
  );
  const projectEndTime = useMemo(
    () => (projectEndDate ? new Date(projectEndDate + "T12:00:00Z").getTime() : null),
    [projectEndDate]
  );

  const xAxisDomain = useMemo((): [number, number] | undefined => {
    if (data.length === 0) return undefined;
    const firstTime = data[0].time;
    const lastTime = data[data.length - 1].time;
    return [
      Math.min(firstTime, projectStartTime ?? firstTime),
      Math.max(lastTime, projectEndTime ?? lastTime),
    ];
  }, [data, projectStartTime, projectEndTime]);

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
          <LineChart data={data} margin={{ top: 40, right: 24, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="time"
              domain={xAxisDomain}
              tickFormatter={(t: number) => formatDate(new Date(t).toISOString().slice(0, 10))}
              padding={{ left: 24, right: 24 }}
            />
            <YAxis allowDecimals={false} />
            <Tooltip
              isAnimationActive
              content={<ChartTooltipContent />}
              labelFormatter={(t) => formatDate(new Date(t as number).toISOString().slice(0, 10))}
              cursor={{
                stroke: "color-mix(in srgb, var(--muted) 40%, transparent)",
                strokeWidth: 1,
              }}
            />
            <Legend />
            {projectStartTime != null ? (
              <ReferenceLine
                x={projectStartTime}
                stroke="#0079bf"
                strokeDasharray="4 4"
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const x = viewBox?.x ?? 0;
                  const y = (viewBox?.y ?? 0) - 8;
                  return (
                    <text x={x} y={y} textAnchor="middle" fill="#0079bf" fontSize={11}>
                      <tspan x={x} dy="0">
                        Project starts
                      </tspan>
                      <tspan x={x} dy="14" fontSize={10} opacity={0.9}>
                        {projectStartDate ? formatDate(projectStartDate) : ""}
                      </tspan>
                    </text>
                  );
                }}
              />
            ) : null}
            {projectEndTime != null && projectEndTime !== projectStartTime ? (
              <ReferenceLine
                x={projectEndTime}
                stroke="#61bd4f"
                strokeDasharray="4 4"
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const x = viewBox?.x ?? 0;
                  const y = (viewBox?.y ?? 0) - 8;
                  const endDateLabel = projectEndDate
                    ? formatDate(projectEndDate)
                    : formatDate(new Date(projectEndTime).toISOString().slice(0, 10));
                  return (
                    <text x={x} y={y} textAnchor="middle" fill="#61bd4f" fontSize={11}>
                      <tspan x={x} dy="0">
                        Project ends
                      </tspan>
                      <tspan x={x} dy="14" fontSize={10} opacity={0.9}>
                        {endDateLabel}
                      </tspan>
                    </text>
                  );
                }}
              />
            ) : null}
            <Line type="monotone" dataKey="backlog" stroke="#0079bf" name="Backlog" strokeWidth={2} dot={{ r: 3 }} isAnimationActive />
            <Line type="monotone" dataKey="inProgress" stroke="#f2d600" name="In progress" strokeWidth={2} dot={{ r: 3 }} isAnimationActive />
            <Line type="monotone" dataKey="completed" stroke="#61bd4f" name="Completed" strokeWidth={2} dot={{ r: 3 }} isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
