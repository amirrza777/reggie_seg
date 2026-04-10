import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrelloBoardAction, TrelloCard } from "../types";
import {
  getBoardStateAtDate,
  getCalendarDaysInRange,
  getDateKeysWithActions,
  nextCalendarDay,
  nextChangeDay,
  prevCalendarDay,
  prevChangeDay,
} from "./boardStateAtDate";

describe("boardStateAtDate", () => {
  const card: TrelloCard = { id: "c1", name: "A", idList: "l2" };

  it("getBoardStateAtDate returns current lists before cutoff and rewinds createCard and updateCard", () => {
    const cardsByList: Record<string, TrelloCard[]> = { l2: [card] };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-02-02": [
        {
          id: "a1",
          type: "createCard",
          date: "2024-02-02T10:00:00.000Z",
          data: { card: { id: "c1" } },
        } as TrelloBoardAction,
      ],
      "2024-02-01": [
        {
          id: "a2",
          type: "updateCard",
          date: "2024-02-01T10:00:00.000Z",
          data: {
            card: { id: "c1" },
            listBefore: { id: "l1" },
          },
        } as TrelloBoardAction,
      ],
    };

    const onFeb2 = getBoardStateAtDate(cardsByList, actionsByDate, "2024-02-02");
    expect(onFeb2.l2?.map((c) => c.id)).toEqual(["c1"]);

    const onJan31 = getBoardStateAtDate(cardsByList, actionsByDate, "2024-01-31");
    expect(onJan31.l1?.map((c) => c.id)).toEqual(["c1"]);
  });

  it("getBoardStateAtDate ignores actions without card id or non-matching update shapes", () => {
    const cardsByList: Record<string, TrelloCard[]> = { l2: [card] };
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-03-01": [
        { id: "x", type: "commentCard", date: "2024-03-01T12:00:00.000Z", data: {} } as TrelloBoardAction,
        {
          id: "y",
          type: "updateCard",
          date: "2024-03-01T11:00:00.000Z",
          data: { card: { id: "c1" } },
        } as TrelloBoardAction,
      ],
    };
    const state = getBoardStateAtDate(cardsByList, actionsByDate, "2024-02-01");
    expect(state.l2?.map((c) => c.id)).toEqual(["c1"]);
  });

  it("getDateKeysWithActions returns sorted keys", () => {
    expect(
      getDateKeysWithActions({
        "2024-02-02": [],
        "2024-01-01": [],
      }),
    ).toEqual(["2024-01-01", "2024-02-02"]);
  });

  describe("calendar helpers with frozen today", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-05T12:00:00Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("getCalendarDaysInRange returns empty when first change is after today", () => {
      expect(getCalendarDaysInRange("2024-07-01")).toEqual([]);
    });

    it("getCalendarDaysInRange lists each day through today", () => {
      expect(getCalendarDaysInRange("2024-06-03")).toEqual(["2024-06-03", "2024-06-04", "2024-06-05"]);
    });

    it("prevCalendarDay returns null before minDate", () => {
      expect(prevCalendarDay("2024-06-02", "2024-06-02")).toBeNull();
      expect(prevCalendarDay("2024-06-03", "2024-06-01")).toBe("2024-06-02");
    });

    it("nextCalendarDay returns null when next would be past today", () => {
      expect(nextCalendarDay("2024-06-05")).toBeNull();
      expect(nextCalendarDay("2024-06-04")).toBe("2024-06-05");
    });
  });

  it("prevChangeDay and nextChangeDay walk sorted change days", () => {
    const days = ["2024-01-01", "2024-01-05", "2024-01-10"];
    expect(prevChangeDay("2024-01-05", days)).toBe("2024-01-01");
    expect(prevChangeDay("2024-01-01", days)).toBeNull();
    expect(nextChangeDay("2024-01-01", days)).toBe("2024-01-05");
    expect(nextChangeDay("2024-01-10", days)).toBe("current");
  });

  it("prevChangeDay returns null when dateKey is after all change days (no match index)", () => {
    expect(prevChangeDay("2099-01-01", ["2020-01-01"])).toBeNull();
  });
});
