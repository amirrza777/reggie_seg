import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardMovementHistory } from "./CardMovementHistory";
import type { TrelloBoardAction } from "../types";

describe("CardMovementHistory", () => {
  it("returns null when there are no dated keys", () => {
    const { container } = render(
      <CardMovementHistory
        actionsByDate={{}}
        listNamesById={{}}
        dateKeysSorted={[]}
        selectedDate="current"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders empty summary cells when a day has no matching actions", () => {
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-02-01": [],
    };
    render(
      <CardMovementHistory
        actionsByDate={actionsByDate}
        listNamesById={{}}
        dateKeysSorted={["2024-02-01"]}
        selectedDate="current"
      />,
    );
    const summaries = screen.getAllByRole("cell").filter((c) => c.cellIndex === 1);
    expect(summaries.some((c) => c.textContent === "")).toBe(true);
  });

  it("renders created and moved rows with name and list fallbacks", () => {
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-02-01": [
        {
          id: "a1",
          type: "createCard",
          date: "2024-02-01T10:00:00.000Z",
          data: { card: { id: "c1", name: "" }, list: { id: "l1" } },
        } as TrelloBoardAction,
        {
          id: "a2",
          type: "updateCard",
          date: "2024-02-01T11:00:00.000Z",
          data: {
            card: { id: "c2" },
            listBefore: { id: "l1" },
            listAfter: { id: "l2" },
          },
        } as TrelloBoardAction,
      ],
    };
    render(
      <CardMovementHistory
        actionsByDate={actionsByDate}
        listNamesById={{ l1: "A", l2: "B" }}
        dateKeysSorted={["2024-02-01"]}
        selectedDate="current"
      />,
    );
    expect(screen.getByText(/1 created/)).toBeInTheDocument();
    expect(screen.getByText(/1 moved/)).toBeInTheDocument();
    const cards = screen.getAllByText("Card");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("renders create/move lines when list ids are missing from listNamesById", () => {
    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-02-02": [
        {
          id: "a1",
          type: "createCard",
          date: "2024-02-02T10:00:00.000Z",
          data: { card: { id: "c1", name: "X" } },
        } as TrelloBoardAction,
        {
          id: "a2",
          type: "updateCard",
          date: "2024-02-02T11:00:00.000Z",
          data: {
            card: { id: "c2" },
            listBefore: {},
            listAfter: {},
          },
        } as TrelloBoardAction,
      ],
    };
    render(
      <CardMovementHistory
        actionsByDate={actionsByDate}
        listNamesById={{}}
        dateKeysSorted={["2024-02-02"]}
        selectedDate="current"
      />,
    );
    expect(screen.getByText(/1 created/)).toBeInTheDocument();
    expect(screen.getByText(/1 moved/)).toBeInTheDocument();
  });

  it("adjusts scrollTop when selected row sits above the scroll container", () => {
    const gbcr = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    gbcr.mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("trello-history__table-wrap")) {
        return { top: 100, bottom: 200, left: 0, right: 0, width: 0, height: 100, x: 0, y: 100, toJSON: () => ({}) } as DOMRect;
      }
      if (this.classList.contains("trello-history__row--selected")) {
        return { top: 50, bottom: 60, left: 0, right: 0, width: 0, height: 10, x: 0, y: 50, toJSON: () => ({}) } as DOMRect;
      }
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });

    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-03-01": [
        {
          id: "x",
          type: "createCard",
          date: "2024-03-01T10:00:00.000Z",
          data: { card: { id: "c1" }, list: { id: "lx" } },
        } as TrelloBoardAction,
      ],
    };

    const { container } = render(
      <CardMovementHistory
        actionsByDate={actionsByDate}
        listNamesById={{ lx: "Lane" }}
        dateKeysSorted={["2024-03-01"]}
        selectedDate="2024-03-01"
      />,
    );

    const wrap = container.querySelector(".trello-history__table-wrap") as HTMLDivElement;
    expect(wrap.scrollTop).toBe(-50);
  });

  it("adjusts scrollTop when selected row extends below the scroll container", () => {
    const gbcr = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    gbcr.mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("trello-history__table-wrap")) {
        return { top: 100, bottom: 150, left: 0, right: 0, width: 0, height: 50, x: 0, y: 100, toJSON: () => ({}) } as DOMRect;
      }
      if (this.classList.contains("trello-history__row--selected")) {
        return { top: 120, bottom: 200, left: 0, right: 0, width: 0, height: 80, x: 0, y: 120, toJSON: () => ({}) } as DOMRect;
      }
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });

    const actionsByDate: Record<string, TrelloBoardAction[]> = {
      "2024-03-01": [
        {
          id: "x",
          type: "createCard",
          date: "2024-03-01T10:00:00.000Z",
          data: { card: { id: "c1" }, list: { id: "lx" } },
        } as TrelloBoardAction,
      ],
    };

    const { container } = render(
      <CardMovementHistory
        actionsByDate={actionsByDate}
        listNamesById={{ lx: "Lane" }}
        dateKeysSorted={["2024-03-01"]}
        selectedDate="2024-03-01"
      />,
    );

    const wrap = container.querySelector(".trello-history__table-wrap") as HTMLDivElement;
    expect(wrap.scrollTop).toBe(50);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
