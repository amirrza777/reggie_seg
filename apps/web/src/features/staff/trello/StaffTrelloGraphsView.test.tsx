import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffTrelloGraphsView } from "./StaffTrelloGraphsView";
import type { BoardView } from "@/features/trello/api/client";

vi.mock("@/features/trello/components/CardDistributionGraph", () => ({
  CardDistributionGraph: ({ title }: { title?: string }) => (
    <div data-testid="staff-trello-graph">{title ?? "Team-wide"}</div>
  ),
}));

const view: BoardView = {
  board: {
    id: "b1",
    name: "B",
    lists: [],
    members: [
      { id: "m1", fullName: "Alex A", initials: "AA" },
      { id: "m2", fullName: "Blake B", initials: "BB" },
    ],
    url: "",
  },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

describe("StaffTrelloGraphsView", () => {
  it("renders one team graph plus one graph per board member", () => {
    render(
      <StaffTrelloGraphsView
        projectId="9"
        view={view}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
      />,
    );

    const graphs = screen.getAllByTestId("staff-trello-graph");
    expect(graphs).toHaveLength(3);
    expect(graphs[0]).toHaveTextContent("Team-wide");
    expect(graphs[1]).toHaveTextContent("Alex A");
    expect(graphs[2]).toHaveTextContent("Blake B");
  });

  it("renders only the team graph when there are no members", () => {
    const noMembersView: BoardView = {
      ...view,
      board: { ...view.board, members: [] },
    };
    render(
      <StaffTrelloGraphsView
        projectId="9"
        view={noMembersView}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("staff-trello-graph")).toHaveLength(1);
  });

  it("treats missing members array as no per-member graphs", () => {
    const noMembersKey: BoardView = {
      ...view,
      board: { ...view.board, members: undefined as unknown as typeof view.board.members },
    };
    render(
      <StaffTrelloGraphsView
        projectId="9"
        view={noMembersKey}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("staff-trello-graph")).toHaveLength(1);
  });

  it("uses initials or Member id when fullName is missing", () => {
    const mixed: BoardView = {
      ...view,
      board: {
        ...view.board,
        members: [
          { id: "m1", fullName: "", initials: "XX" },
          { id: "m2", fullName: "", initials: "" },
        ],
      },
    };
    render(
      <StaffTrelloGraphsView
        projectId="9"
        view={mixed}
        sectionConfig={{}}
        onRequestChangeBoard={vi.fn()}
      />,
    );
    const graphs = screen.getAllByTestId("staff-trello-graph");
    expect(graphs[1]).toHaveTextContent("XX");
    expect(graphs[2]).toHaveTextContent("Member m2");
  });
});
