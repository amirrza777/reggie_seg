import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BoardView } from "@/features/trello/api/client";
import { useTrelloSummaryData } from "./useTrelloSummaryData";

const minimalView: BoardView = {
  board: {
    id: "b1",
    name: "B",
    lists: [{ id: "l1", name: "Backlog" }],
    members: [],
    url: "https://trello.com/b/x",
  },
  listNamesById: { l1: "Backlog" },
  actionsByDate: {},
  cardsByList: { l1: [] },
};

describe("useTrelloSummaryData", () => {
  it("derives counts, velocity, and chart series from view", () => {
    const { result } = renderHook(() => useTrelloSummaryData(minimalView, {}, null));

    expect(result.current.counts.total).toBe(0);
    expect(result.current.velocity).toMatchObject({
      thisWeek: expect.any(Number),
      lastWeek: expect.any(Number),
    });
    expect(Array.isArray(result.current.chartData)).toBe(true);
    expect(result.current.chartData.every((p) => typeof p.week === "string")).toBe(true);
    expect(result.current.xAxisDomain).toHaveLength(2);
    expect(result.current.boardUrl).toBe("https://trello.com/b/x");
    expect(result.current.deadlineStart).toBeUndefined();
  });

  it("passes deadline into normalized range and chart", () => {
    const deadline = {
      taskOpenDate: "2025-01-01",
      taskDueDate: "2025-12-31",
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    };
    const { result } = renderHook(() => useTrelloSummaryData(minimalView, {}, deadline));

    expect(result.current.deadlineStart).toBe("2025-01-01");
    expect(result.current.deadlineEnd).toBe("2025-12-31");
    expect(result.current.projectStartTime).not.toBeNull();
  });

  it("exposes boardUrl from view even when undefined", () => {
    const view = {
      ...minimalView,
      board: { ...minimalView.board, url: undefined as unknown as string },
    };
    const { result } = renderHook(() => useTrelloSummaryData(view, {}, null));
    expect(result.current.boardUrl).toBeUndefined();
  });

  it("coalesces nullish view collections and section config", () => {
    const view = {
      ...minimalView,
      actionsByDate: null as unknown as BoardView["actionsByDate"],
      listNamesById: null as unknown as BoardView["listNamesById"],
      cardsByList: null as unknown as BoardView["cardsByList"],
    };
    const { result } = renderHook(() => useTrelloSummaryData(view, null as unknown as Record<string, string>, null));
    expect(Array.isArray(result.current.chartData)).toBe(true);
    expect(result.current.xAxisDomain).toHaveLength(2);
  });
});
