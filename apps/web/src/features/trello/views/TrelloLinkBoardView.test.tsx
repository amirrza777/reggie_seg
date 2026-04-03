import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import {
  assignBoardToTeam,
  getBoardById,
  getMyBoards,
  type BoardView,
  type OwnerBoard,
} from "@/features/trello/api/client";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { TrelloLinkBoardView } from "./TrelloLinkBoardView";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/trello/api/client", () => ({
  assignBoardToTeam: vi.fn(),
  getBoardById: vi.fn(),
  getMyBoards: vi.fn(),
}));

const pushMock = vi.fn();
const useRouterMock = vi.mocked(useRouter);
const assignBoardToTeamMock = vi.mocked(assignBoardToTeam);
const getBoardByIdMock = vi.mocked(getBoardById);
const getMyBoardsMock = vi.mocked(getMyBoards);

function buildPreview(): BoardView {
  return {
    board: {
      id: "board-1",
      name: "Board One",
      members: [
        { id: "m-1", fullName: "Alex Doe" },
        { id: "m-2", fullName: "", initials: "JD" },
      ],
      lists: [
        { id: "list-1", name: "Todo" },
        { id: "list-2", name: "Done" },
      ],
    },
    listNamesById: { "list-1": "Todo", "list-2": "Done" },
    actionsByDate: {},
    cardsByList: {
      "list-1": [
        { id: "c-1", name: "Card 1", idList: "list-1" },
        { id: "c-2", name: "Card 2", idList: "list-1" },
        { id: "c-3", name: "Card 3", idList: "list-1" },
        { id: "c-4", name: "Card 4", idList: "list-1" },
        { id: "c-5", name: "Card 5", idList: "list-1" },
        { id: "c-6", name: "Card 6", idList: "list-1" },
      ],
      "list-2": [],
    },
  };
}

describe("TrelloLinkBoardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({ push: pushMock } as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads and renders board preview details", async () => {
    getBoardByIdMock.mockResolvedValue(buildPreview());

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        teamName="Team Rocket"
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    expect(screen.getByText(/Loading board preview/i)).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByText("Alex Doe, JD")).toBeInTheDocument();
    expect(screen.getByText("Card 1")).toBeInTheDocument();
    expect(screen.getByText("Card 5")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    expect(screen.getByText("No cards")).toBeInTheDocument();
  });

  it("shows searching state while board query is loading", async () => {
    let resolveBoards: ((value: OwnerBoard[]) => void) | null = null;
    getMyBoardsMock.mockReturnValueOnce(
      new Promise<OwnerBoard[]>((resolve) => {
        resolveBoards = resolve;
      }),
    );
    getBoardByIdMock.mockResolvedValue(buildPreview());

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    const searchField = screen.getByRole("searchbox", { name: "Search Trello boards" });
    fireEvent.change(searchField, { target: { value: "abc" } });

    await waitFor(() => {
      expect(getMyBoardsMock).toHaveBeenCalledWith({ query: "abc" });
    }, {
      timeout: SEARCH_DEBOUNCE_MS * 4,
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Searching boards..." })).toBeInTheDocument();
    });

    resolveBoards?.([{ id: "board-1", name: "Board One" }]);
    expect(await screen.findByRole("option", { name: "Board One" })).toBeInTheDocument();
  });

  it("shows empty-board state and hydrates selection when boards prop becomes available", async () => {
    getBoardByIdMock.mockResolvedValue(buildPreview());

    const { rerender } = render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[]}
        onAssigned={vi.fn()}
      />,
    );

    const searchField = screen.getByRole("searchbox", { name: "Search Trello boards" });
    expect(searchField).toBeDisabled();
    expect(screen.getByRole("option", { name: "No boards available" })).toBeInTheDocument();

    rerender(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(getBoardByIdMock).toHaveBeenCalledWith("board-1");
    });
    expect(searchField).not.toBeDisabled();
  });

  it("shows no-match fallback and recovers to empty default list", async () => {
    getMyBoardsMock
      .mockResolvedValueOnce([{ id: "board-2", name: "Board Two" }])
      .mockRejectedValueOnce(new Error("search failed"));
    getBoardByIdMock.mockResolvedValue(buildPreview());

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    const searchField = screen.getByRole("searchbox", { name: "Search Trello boards" });
    fireEvent.change(searchField, { target: { value: "two" } });

    await waitFor(
      () => {
        expect(getMyBoardsMock).toHaveBeenCalledWith({ query: "two" });
      },
      { timeout: SEARCH_DEBOUNCE_MS * 4 },
    );
    expect(await screen.findByRole("option", { name: "Board Two" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Select Trello board" }), {
      target: { value: "board-2" },
    });

    fireEvent.change(searchField, { target: { value: "zzz" } });

    await waitFor(
      () => {
        expect(getMyBoardsMock).toHaveBeenCalledWith({ query: "zzz" });
      },
      { timeout: SEARCH_DEBOUNCE_MS * 4 },
    );
    expect(await screen.findByRole("option", { name: 'No boards match "zzz"' })).toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: "" } });
    expect(await screen.findByRole("option", { name: "Board One" })).toBeInTheDocument();
  });

  it("renders preview fallback branches for missing members/lists and short card lists", async () => {
    const sparsePreview: BoardView = {
      board: {
        id: "board-1",
        name: "Board One",
        members: [],
        lists: [
          { id: "list-a", name: "Backlog" },
          { id: "list-b", name: "Done" },
        ],
      },
      listNamesById: { "list-a": "Backlog", "list-b": "Done" },
      actionsByDate: {},
      cardsByList: {
        "list-a": [{ id: "one", name: "Single card", idList: "list-a" }],
      },
    };
    const noListsPreview: BoardView = {
      board: {
        id: "board-2",
        name: "Board Two",
        members: [],
      },
      listNamesById: {},
      actionsByDate: {},
      cardsByList: {},
    };
    getBoardByIdMock
      .mockResolvedValueOnce(sparsePreview)
      .mockResolvedValueOnce(noListsPreview);

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[
          { id: "board-1", name: "Board One" },
          { id: "board-2", name: "Board Two" },
        ]}
        onAssigned={vi.fn()}
      />,
    );

    expect(await screen.findByText("Single card")).toBeInTheDocument();
    expect(screen.getByText("No cards")).toBeInTheDocument();
    expect(screen.queryByText(/Members \(/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Select Trello board" }), {
      target: { value: "board-2" },
    });

    await waitFor(() => {
      expect(document.querySelectorAll(".trello-link-board__list")).toHaveLength(0);
    });
  });

  it("clears preview when board details request fails", async () => {
    getBoardByIdMock.mockRejectedValueOnce(new Error("preview failed"));

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Preview" })).not.toBeInTheDocument();
    });
  });

  it("ignores stale board-search results when query changes", async () => {
    vi.useFakeTimers();
    getBoardByIdMock.mockResolvedValue(buildPreview());

    let rejectStale: ((reason?: unknown) => void) | null = null;
    let resolveFresh: ((value: OwnerBoard[]) => void) | null = null;
    getMyBoardsMock
      .mockReturnValueOnce(
        new Promise<OwnerBoard[]>((_, reject) => {
          rejectStale = reject;
        }),
      )
      .mockReturnValueOnce(
        new Promise<OwnerBoard[]>((resolve) => {
          resolveFresh = resolve;
        }),
      );

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    const searchField = screen.getByRole("searchbox", { name: "Search Trello boards" });
    fireEvent.change(searchField, { target: { value: "stale" } });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.change(searchField, { target: { value: "fresh" } });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await act(async () => {
      rejectStale?.(new Error("stale"));
      resolveFresh?.([{ id: "board-2", name: "Board Two" }]);
      await Promise.resolve();
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByRole("option", { name: "Board Two" })).toBeInTheDocument();
  });

  it("shows fallback assignment error text for non-Error rejections", async () => {
    getBoardByIdMock.mockResolvedValue(buildPreview());
    assignBoardToTeamMock.mockRejectedValueOnce("boom");

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={5}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Link board" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to assign board.");
  });

  it("links board successfully and redirects", async () => {
    getBoardByIdMock.mockResolvedValue(buildPreview());

    let resolveAssign: ((value: { message: string }) => void) | null = null;
    assignBoardToTeamMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAssign = resolve;
      }),
    );

    const onAssigned = vi.fn();
    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={7}
        boards={[{ id: "board-1", name: "Board One" }]}
        onAssigned={onAssigned}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Link board" }));

    expect(assignBoardToTeamMock).toHaveBeenCalledWith(7, "board-1");
    expect(screen.getByRole("button", { name: "Linking…" })).toBeDisabled();

    resolveAssign?.({ message: "ok" });

    await waitFor(() => {
      expect(onAssigned).toHaveBeenCalledTimes(1);
    });
    expect(pushMock).toHaveBeenCalledWith("/projects/10/trello/configure");
  });

  it("keeps selected board visible across filtered results and shows assignment errors", async () => {
    getBoardByIdMock.mockResolvedValue(buildPreview());
    getMyBoardsMock.mockResolvedValueOnce([{ id: "board-2", name: "Board Two" }]);
    assignBoardToTeamMock.mockRejectedValueOnce(new Error("assign failed"));

    render(
      <TrelloLinkBoardView
        projectId="10"
        teamId={9}
        boards={[
          { id: "board-1", name: "Board One" },
          { id: "board-2", name: "Board Two" },
        ]}
        onAssigned={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search Trello boards" }), {
      target: { value: "two" },
    });

    await waitFor(
      () => {
        expect(getMyBoardsMock).toHaveBeenCalledWith({ query: "two" });
      },
      { timeout: 2000 },
    );

    expect(screen.getByRole("option", { name: "Board One" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Board Two" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Link board" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("assign failed");
  });
});
