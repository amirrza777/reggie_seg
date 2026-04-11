import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TrelloGraphsView } from "./TrelloGraphsView";
import { getMyTrelloMemberId } from "@/features/trello/api/client";
import type { BoardView } from "@/features/trello/api/client";

vi.mock("@/features/trello/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/trello/api/client")>();
  return {
    ...actual,
    getMyTrelloMemberId: vi.fn(),
  };
});

vi.mock("@/features/trello/components/CardDistributionGraph", () => ({
  CardDistributionGraph: ({ title }: { title?: string }) => (
    <div data-testid={title ? "trello-graph-personal" : "trello-graph-team"}>{title ?? "Team"}</div>
  ),
}));

const view: BoardView = {
  board: { id: "b1", name: "B", lists: [], members: [], url: "" },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

const getMyTrelloMemberIdMock = vi.mocked(getMyTrelloMemberId);

describe("TrelloGraphsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always renders the team-wide graph", async () => {
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: null });

    render(<TrelloGraphsView projectId="1" view={view} sectionConfig={{}} />);

    expect(screen.getByTestId("trello-graph-team")).toBeInTheDocument();
    await waitFor(() => {
      expect(getMyTrelloMemberIdMock).toHaveBeenCalled();
    });
  });

  it("renders a personalised graph when the viewer has a Trello member id", async () => {
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: "mem-1" });

    render(<TrelloGraphsView projectId="1" view={view} sectionConfig={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId("trello-graph-personal")).toBeInTheDocument();
    });
  });

  it("still shows the personalised graph when integrationsReadOnly (archived project — graphs unchanged)", async () => {
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: "mem-1" });

    render(
      <TrelloGraphsView projectId="1" view={view} sectionConfig={{}} integrationsReadOnly />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("trello-graph-personal")).toBeInTheDocument();
    });
    expect(getMyTrelloMemberIdMock).toHaveBeenCalled();
  });
});
