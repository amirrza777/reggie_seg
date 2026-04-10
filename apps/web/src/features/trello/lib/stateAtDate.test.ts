import { describe, expect, it } from "vitest";
import type { TrelloBoardAction, TrelloCard } from "../types";
import { buildCurrentState, computeCountsAtDate } from "./stateAtDate";

const listNamesById = { l1: "Backlog", l2: "Doing", l3: "Done" };
const sectionConfig: Record<string, string> = { Done: "completed" };

describe("stateAtDate", () => {
  it("buildCurrentState maps each card id to its list id", () => {
    const cardsByList: Record<string, TrelloCard[]> = {
      l1: [{ id: "c1", idList: "l1" } as TrelloCard],
      l2: [{ id: "c2", idList: "l2" } as TrelloCard, { id: "c3", idList: "l2" } as TrelloCard],
    };
    expect(buildCurrentState(cardsByList)).toEqual({ c1: "l1", c2: "l2", c3: "l2" });
  });

  it("computeCountsAtDate uses current list positions when no actions replay past cutoff", () => {
    const currentState = { c1: "l1" };
    const counts = computeCountsAtDate("2025-12-31", [], currentState, listNamesById, {});
    expect(counts.backlog).toBe(1);
    expect(counts.inProgress).toBe(0);
    expect(counts.completed).toBe(0);
  });

  it("skips actions without card id and information_only lists", () => {
    const currentState = { c1: "l1" };
    const allActionsDesc: TrelloBoardAction[] = [
      { id: "x", type: "commentCard", date: "2025-06-20T10:00:00.000Z", data: {} } as TrelloBoardAction,
    ];
    const counts = computeCountsAtDate(
      "2025-06-25",
      allActionsDesc,
      currentState,
      { l1: "Notes" },
      { Notes: "information_only" },
    );
    expect(counts).toEqual({ backlog: 0, inProgress: 0, completed: 0 });
  });

  it("replays updateCard when action is after cutoff", () => {
    const currentState = { c1: "l2" };
    const allActionsDesc: TrelloBoardAction[] = [
      {
        id: "a2",
        type: "updateCard",
        date: "2025-06-20T12:00:00.000Z",
        data: { card: { id: "c1" }, listBefore: { id: "l1" } },
      } as TrelloBoardAction,
    ];
    const counts = computeCountsAtDate("2025-06-10", allActionsDesc, currentState, listNamesById, sectionConfig);
    expect(counts.backlog).toBe(1);
    expect(counts.inProgress).toBe(0);
  });

  it("counts in-progress and completed from list names", () => {
    const currentState = { c1: "l2", c2: "l3" };
    const counts = computeCountsAtDate("2025-12-31", [], currentState, listNamesById, sectionConfig);
    expect(counts.inProgress).toBe(1);
    expect(counts.completed).toBe(1);
  });

  it("computeCountsAtDate ignores updateCard without listBefore id", () => {
    const currentState = { c1: "l2" };
    const allActionsDesc: TrelloBoardAction[] = [
      {
        id: "u",
        type: "updateCard",
        date: "2025-06-20T12:00:00.000Z",
        data: { card: { id: "c1" } },
      } as TrelloBoardAction,
    ];
    const counts = computeCountsAtDate("2025-06-10", allActionsDesc, currentState, listNamesById, sectionConfig);
    expect(counts.inProgress).toBe(1);
  });

  it("computeCountsAtDate uses empty list name when list id is unknown in listNamesById", () => {
    const currentState = { c1: "lx" };
    const counts = computeCountsAtDate("2025-12-31", [], currentState, listNamesById, {});
    expect(counts.backlog).toBe(0);
    expect(counts.inProgress).toBe(1);
  });
});
