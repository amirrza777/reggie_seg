import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDistributionGraph } from "./CardDistributionGraph";
import type { TrelloBoardAction, TrelloCard } from "../types";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="rc">{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}));

vi.mock("@/shared/ui/ChartTooltipContent", () => ({
  ChartTooltipContent: () => null,
}));

describe("CardDistributionGraph", () => {
  const listNamesById = { l1: "Backlog", l2: "Doing", l3: "Done" };
  const cardsByList: Record<string, TrelloCard[]> = {
    l1: [{ id: "c1", name: "A", idList: "l1" }],
  };
  const actionsByDate: Record<string, TrelloBoardAction[]> = {
    "2024-01-02": [
      {
        id: "a1",
        type: "createCard",
        date: "2024-01-02T10:00:00.000Z",
        data: { card: { id: "c1" }, list: { id: "l1" } },
      } as TrelloBoardAction,
    ],
  };

  it("returns null when there are no action dates", () => {
    const { container } = render(
      <CardDistributionGraph
        actionsByDate={{}}
        listNamesById={listNamesById}
        cardsByList={cardsByList}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when member filter matches no cards", () => {
    const { container } = render(
      <CardDistributionGraph
        actionsByDate={actionsByDate}
        listNamesById={listNamesById}
        cardsByList={cardsByList}
        memberIdFilter="nomatch"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders chart with section config statuses and optional boundaries", () => {
    const sectionConfig = {
      Backlog: "backlog",
      Doing: "work_in_progress",
      Done: "information_only",
    };
    render(
      <CardDistributionGraph
        actionsByDate={actionsByDate}
        listNamesById={listNamesById}
        cardsByList={cardsByList}
        sectionConfig={sectionConfig}
        title="Custom title"
        projectStartDate="2024-01-01"
        projectEndDate="2024-01-10"
      />,
    );
    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("skips end boundary line when end time equals start time", () => {
    render(
      <CardDistributionGraph
        actionsByDate={actionsByDate}
        listNamesById={listNamesById}
        cardsByList={cardsByList}
        projectStartDate="2024-01-02"
        projectEndDate="2024-01-02"
      />,
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("maps list names and config variants for status bucketing", () => {
    const cfg = {
      Special: "work in progress",
      Lane: "completed",
    };
    const lists = { lx: "Special", ly: "completed", lz: "Lane" };
    const cards: Record<string, TrelloCard[]> = {
      lx: [{ id: "a", name: "A", idList: "lx" }],
      ly: [{ id: "b", name: "B", idList: "ly" }],
      lz: [{ id: "c", name: "C", idList: "lz" }],
    };
    const acts: Record<string, TrelloBoardAction[]> = {
      "2024-01-02": [
        {
          id: "1",
          type: "createCard",
          date: "2024-01-02T10:00:00.000Z",
          data: { card: { id: "a" }, list: { id: "lx" } },
        } as TrelloBoardAction,
      ],
      "2024-01-03": [
        {
          id: "2",
          type: "createCard",
          date: "2024-01-03T10:00:00.000Z",
          data: { card: { id: "b" }, list: { id: "ly" } },
        } as TrelloBoardAction,
      ],
    };
    render(
      <CardDistributionGraph
        actionsByDate={acts}
        listNamesById={lists}
        cardsByList={cards}
        sectionConfig={cfg}
      />,
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("uses member filter path when cardIds empty (falls back to full actions)", () => {
    const emptyCards: Record<string, TrelloCard[]> = { l1: [] };
    render(
      <CardDistributionGraph
        actionsByDate={actionsByDate}
        listNamesById={listNamesById}
        cardsByList={emptyCards}
        memberIdFilter="any"
      />,
    );
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("includes filtered member cards in series", () => {
    const cards: Record<string, TrelloCard[]> = {
      l1: [{ id: "c1", name: "A", idList: "l1", idMembers: ["m99"] }],
    };
    render(
      <CardDistributionGraph
        actionsByDate={actionsByDate}
        listNamesById={listNamesById}
        cardsByList={cards}
        memberIdFilter="m99"
      />,
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("derives status from list name casing and replays updateCard without section config", () => {
    const lists = { lb: "BACKLOG", ld: "Completed" };
    const cards: Record<string, TrelloCard[]> = {
      ld: [{ id: "c1", name: "Task", idList: "ld" }],
    };
    const acts: Record<string, TrelloBoardAction[]> = {
      "2024-01-02": [
        {
          id: "mv",
          type: "updateCard",
          date: "2024-01-02T11:00:00.000Z",
          data: {
            card: { id: "c1" },
            listBefore: { id: "lb" },
            listAfter: { id: "ld" },
          },
        } as TrelloBoardAction,
      ],
      "2024-01-01": [
        {
          id: "cr",
          type: "createCard",
          date: "2024-01-01T10:00:00.000Z",
          data: { card: { id: "c1" }, list: { id: "lb" } },
        } as TrelloBoardAction,
      ],
    };
    render(
      <CardDistributionGraph actionsByDate={acts} listNamesById={lists} cardsByList={cards} />,
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
