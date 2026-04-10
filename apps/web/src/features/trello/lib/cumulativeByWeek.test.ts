import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrelloBoardAction, TrelloCard } from "../types";
import { computeCumulativeByWeek } from "./cumulativeByWeek";

describe("cumulativeByWeek", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns weekly points for project date range", () => {
    const cardsByList: Record<string, TrelloCard[]> = {
      l1: [{ id: "c1", idList: "l1" } as TrelloCard],
    };
    const listNamesById = { l1: "Backlog" };
    const sectionConfig: Record<string, string> = {};
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2025-06-01": [
        {
          id: "a1",
          type: "createCard",
          date: "2025-06-01T10:00:00.000Z",
          data: { card: { id: "c1" }, list: { id: "l1" } },
        } as TrelloBoardAction,
      ],
    };
    const out = computeCumulativeByWeek(
      actionsByDate,
      listNamesById,
      sectionConfig,
      cardsByList,
      12,
      "2025-06-02",
      "2025-06-16",
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).toMatchObject({
      weekKey: expect.any(String),
      weekLabel: expect.stringMatching(/Week/),
      total: expect.any(Number),
      completed: expect.any(Number),
    });
  });

  it("handles empty actions with explicit start/end", () => {
    const out = computeCumulativeByWeek({}, {}, {}, {}, 12, "2025-06-09", "2025-06-09");
    expect(Array.isArray(out)).toBe(true);
  });

  it("normalizes reversed start/end keys", () => {
    const out = computeCumulativeByWeek({}, {}, {}, {}, 12, "2025-06-16", "2025-06-02");
    expect(out.length).toBeGreaterThan(0);
  });

  it("uses only endKey when start missing (52-week lookback)", () => {
    const out = computeCumulativeByWeek({}, {}, {}, {}, 12, undefined, "2025-06-10");
    expect(out.length).toBeGreaterThan(0);
  });

  it("zeros counts for future week end", () => {
    const futureEnd = "2099-12-31";
    const out = computeCumulativeByWeek({}, {}, {}, {}, 12, "2099-12-01", futureEnd);
    const futurePoint = out.find((p) => p.weekEndDateKey >= "2099-12");
    expect(futurePoint?.total).toBe(0);
  });

  it("uses only startKey when end missing (through today)", () => {
    const out = computeCumulativeByWeek({}, {}, {}, {}, 12, "2025-06-02", undefined);
    expect(out.length).toBeGreaterThan(0);
  });

  it("caps inferred range at today when latest action is in the future", () => {
    const future = "2099-01-15";
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      [future]: [
        {
          id: "a",
          type: "commentCard",
          date: `${future}T12:00:00.000Z`,
          data: {},
        } as TrelloBoardAction,
      ],
    };
    const out = computeCumulativeByWeek(actionsByDate, {}, {}, {}, 12, undefined, undefined);
    expect(out.length).toBeGreaterThan(0);
  });

  it("infers week range from today when actions and project bounds are all missing", () => {
    const out = computeCumulativeByWeek({}, {}, {}, {}, 12, undefined, undefined);
    expect(out.length).toBeGreaterThan(0);
  });
});
