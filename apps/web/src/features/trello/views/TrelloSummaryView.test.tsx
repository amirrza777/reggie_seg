import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrelloSummaryView } from "./TrelloSummaryView";
import type { BoardView } from "@/features/trello/api/client";

const mockBoardView: BoardView = {
  board: { id: "b1", name: "Team board", lists: [], members: [], url: "https://trello.com/b/abc" },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

vi.mock("@/features/trello/hooks/useTrelloSummaryData", () => ({
  useTrelloSummaryData: () => ({
    counts: { total: 0, backlog: 0, inProgress: 0, completed: 0, informationOnly: 0 },
    velocity: { thisWeek: 0, lastWeek: 0, percentChange: null, byWeek: [] },
    chartData: [],
    dateRangeSubtitle: null,
    xAxisDomain: [Date.now() - 86400000, Date.now()] as [number, number],
    deadlineStart: undefined,
    deadlineEnd: undefined,
    projectStartTime: null,
    projectEndTime: null,
    boardUrl: "https://trello.com/b/abc",
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("TrelloSummaryView", () => {
  it("renders integration settings for students by default", () => {
    render(
      <TrelloSummaryView
        projectId="5"
        view={mockBoardView}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
        onRequestChangeAccount={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /configure trello/i })).toBeInTheDocument();
  });

  it("hides integration settings when showIntegrationSettings is false (staff read-only)", () => {
    render(
      <TrelloSummaryView
        projectId="5"
        view={mockBoardView}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
        showIntegrationSettings={false}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configure trello/i })).not.toBeInTheDocument();
  });

  it("hides change actions when integrationsReadOnly (archived project)", () => {
    render(
      <TrelloSummaryView
        projectId="5"
        view={mockBoardView}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
        integrationsReadOnly
      />,
    );

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configure trello/i })).not.toBeInTheDocument();
    expect(screen.getByText(/view-only while this project is archived/i)).toBeInTheDocument();
  });
});
