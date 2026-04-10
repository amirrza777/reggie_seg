import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrelloBoardAction, TrelloCard } from "../types";
import * as weekUtils from "./weekUtils";
import { getWeekStartKeyLocal } from "./weekUtils";
import { computeVelocity, computeVelocityWithNonCompleted } from "./velocityStats";

describe("velocityStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("computeVelocity ignores non-completion updates", () => {
    const listNamesById = { lDone: "Done", lOther: "Other" };
    const sectionConfig = { Done: "completed" };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2025-06-16": [
        {
          id: "bad-type",
          type: "commentCard",
          date: "2025-06-16T15:00:00.000Z",
          data: { card: { id: "c1" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
        {
          id: "no-list-after",
          type: "updateCard",
          date: "2025-06-16T16:00:00.000Z",
          data: { card: { id: "c2" } },
        } as TrelloBoardAction,
        {
          id: "wrong-list",
          type: "updateCard",
          date: "2025-06-16T17:00:00.000Z",
          data: { card: { id: "c3" }, listAfter: { id: "lOther" } },
        } as TrelloBoardAction,
      ],
    };
    const v = computeVelocity(actionsByDate, listNamesById, sectionConfig);
    expect(v.thisWeek).toBe(0);
    expect(v.lastWeek).toBe(0);
  });

  it("computeVelocity counts moves into completed lists by week", () => {
    const listNamesById = { lDone: "Done", lOther: "Other" };
    const sectionConfig = { Done: "completed" };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2025-06-16": [
        {
          id: "1",
          type: "updateCard",
          date: "2025-06-16T15:00:00.000Z",
          data: { card: { id: "c1" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
      ],
    };
    const v = computeVelocity(actionsByDate, listNamesById, sectionConfig);
    expect(v.byWeek.length).toBeGreaterThanOrEqual(1);
    expect(v.percentChange === null || typeof v.percentChange === "number").toBe(true);
  });

  it("computeVelocity percentChange is null when last week had no completions", () => {
    const listNamesById = { lDone: "Done" };
    const sectionConfig = { Done: "completed" };
    const v = computeVelocity({}, listNamesById, sectionConfig);
    expect(v.thisWeek).toBe(0);
    expect(v.lastWeek).toBe(0);
    expect(v.percentChange).toBeNull();
  });

  it("computeVelocity returns numeric percentChange when lastWeek is greater than zero", () => {
    const now = new Date("2025-06-18T12:00:00.000Z");
    vi.setSystemTime(now);
    const thisWeekKey = getWeekStartKeyLocal(now);
    const lastWeekKey = getWeekStartKeyLocal(new Date(now.getTime() - 7 * 86400000));
    const listNamesById = { lDone: "Done" };
    const sectionConfig = { Done: "completed" };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      last: [
        {
          id: "1",
          type: "updateCard",
          date: `${lastWeekKey}T15:00:00`,
          data: { card: { id: "c1" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
        {
          id: "2",
          type: "updateCard",
          date: `${lastWeekKey}T16:00:00`,
          data: { card: { id: "c2" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
      ],
      this: [
        {
          id: "3",
          type: "updateCard",
          date: `${thisWeekKey}T15:00:00`,
          data: { card: { id: "c3" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
        {
          id: "4",
          type: "updateCard",
          date: `${thisWeekKey}T16:00:00`,
          data: { card: { id: "c4" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
        {
          id: "5",
          type: "updateCard",
          date: `${thisWeekKey}T17:00:00`,
          data: { card: { id: "c5" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
        {
          id: "6",
          type: "updateCard",
          date: `${thisWeekKey}T18:00:00`,
          data: { card: { id: "c6" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
      ],
    };
    const v = computeVelocity(actionsByDate, listNamesById, sectionConfig);
    expect(v.lastWeek).toBe(2);
    expect(v.thisWeek).toBe(4);
    expect(v.percentChange).toBe(100);
  });

  it("computeVelocityWithNonCompleted adds non-completed counts per week", () => {
    const listNamesById = { l1: "Backlog", lDone: "Done" };
    const sectionConfig = { Done: "completed" };
    const cardsByList: Record<string, TrelloCard[]> = {
      l1: [{ id: "c1", idList: "l1" } as TrelloCard],
    };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2025-06-16": [
        {
          id: "1",
          type: "updateCard",
          date: "2025-06-16T15:00:00.000Z",
          data: { card: { id: "c1" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
      ],
    };
    const v = computeVelocityWithNonCompleted(actionsByDate, listNamesById, sectionConfig, cardsByList);
    expect(v.byWeekWithNonCompleted.length).toBe(v.byWeek.length);
    expect(v.byWeekWithNonCompleted[0]).toMatchObject({
      weekKey: expect.any(String),
      completed: expect.any(Number),
      nonCompleted: expect.any(Number),
    });
  });

  it("computeVelocityWithNonCompleted treats falsy end-of-week key as zero non-completed", () => {
    vi.spyOn(weekUtils, "getEndOfWeekDateKey").mockReturnValue("");
    const listNamesById = { l1: "Backlog", lDone: "Done" };
    const sectionConfig = { Done: "completed" };
    const cardsByList: Record<string, TrelloCard[]> = {
      l1: [{ id: "c1", idList: "l1" } as TrelloCard],
    };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2025-06-16": [
        {
          id: "1",
          type: "updateCard",
          date: "2025-06-16T15:00:00.000Z",
          data: { card: { id: "c1" }, listAfter: { id: "lDone" } },
        } as TrelloBoardAction,
      ],
    };
    const v = computeVelocityWithNonCompleted(actionsByDate, listNamesById, sectionConfig, cardsByList);
    expect(v.byWeekWithNonCompleted.some((row) => row.nonCompleted === 0)).toBe(true);
  });
});
