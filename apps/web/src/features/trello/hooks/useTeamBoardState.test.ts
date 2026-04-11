import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getMyBoards, getTeamBoard } from "../api/client";
import { useTeamBoardState } from "./useTeamBoardState";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    getTeamBoard: vi.fn(),
    getMyBoards: vi.fn(),
  };
});

const getTeamBoardMock = vi.mocked(getTeamBoard);
const getMyBoardsMock = vi.mocked(getMyBoards);

const mockBoardView = {
  board: { id: "b1", name: "Board 1", lists: [], members: [], url: "https://trello.com/b/1" },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

describe("useTeamBoardState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes empty mergedSectionConfig while not on board state", () => {
    getTeamBoardMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useTeamBoardState(10));
    expect(result.current.state.status).toBe("loading");
    expect(result.current.mergedSectionConfig).toEqual({});
  });

  it("starts in loading state and resolves to board when getTeamBoard returns ok", async () => {
    getTeamBoardMock.mockResolvedValue({ ok: true, view: mockBoardView, sectionConfig: {} });

    const { result } = renderHook(() => useTeamBoardState(10));

    expect(result.current.state.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.state.status).toBe("board");
    });

    expect(result.current.state.status).toBe("board");
    if (result.current.state.status === "board") {
      expect(result.current.state.view.board.name).toBe("Board 1");
    }
    expect(getTeamBoardMock).toHaveBeenCalledWith(10);
  });

  it("transitions to join-board when getTeamBoard returns requireJoin", async () => {
    getTeamBoardMock.mockResolvedValue({
      ok: false,
      requireJoin: true,
      boardUrl: "https://trello.com/b/join-me",
    });

    const { result } = renderHook(() => useTeamBoardState(10));

    await waitFor(() => {
      expect(result.current.state.status).toBe("join-board");
    });

    if (result.current.state.status === "join-board") {
      expect(result.current.state.boardUrl).toBe("https://trello.com/b/join-me");
    }
  });

  it("transitions to link-board when getTeamBoard throws No board assigned and getMyBoards succeeds", async () => {
    getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
    getMyBoardsMock.mockResolvedValue([{ id: "b1", name: "My Board" }]);

    const { result } = renderHook(() => useTeamBoardState(10));

    await waitFor(() => {
      expect(result.current.state.status).toBe("link-board");
    });

    if (result.current.state.status === "link-board") {
      expect(result.current.state.boards).toEqual([{ id: "b1", name: "My Board" }]);
    }
    expect(getMyBoardsMock).toHaveBeenCalled();
  });

  it("transitions to no-team-board when getTeamBoard throws No board assigned and getMyBoards throws User not connected", async () => {
    getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
    getMyBoardsMock.mockRejectedValue(new Error("User not connected to Trello"));

    const { result } = renderHook(() => useTeamBoardState(10));

    await waitFor(() => {
      expect(result.current.state.status).toBe("no-team-board");
    });
  });

  it("transitions to error when getTeamBoard throws Not a member", async () => {
    getTeamBoardMock.mockRejectedValue(new Error("Not a member of this team"));

    const { result } = renderHook(() => useTeamBoardState(10));

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });

    if (result.current.state.status === "error") {
      expect(result.current.state.message).toBe("Not a member of this team");
    }
  });

  it("staffView: no-team-board when no board assigned without getMyBoards", async () => {
    getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));

    const { result } = renderHook(() => useTeamBoardState(10, { staffView: true }));

    await waitFor(() => {
      expect(result.current.state.status).toBe("no-team-board");
    });

    expect(getMyBoardsMock).not.toHaveBeenCalled();
  });

  it("loadTeamBoard can be called to refetch", async () => {
    getTeamBoardMock.mockResolvedValue({ ok: true, view: mockBoardView, sectionConfig: {} });

    const { result } = renderHook(() => useTeamBoardState(10));

    await waitFor(() => {
      expect(result.current.state.status).toBe("board");
    });

    getTeamBoardMock.mockResolvedValue({
      ok: false,
      requireJoin: true,
      boardUrl: "https://trello.com/b/other",
    });

    await act(async () => {
      await result.current.loadTeamBoard();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("join-board");
    });
    if (result.current.state.status === "join-board") {
      expect(result.current.state.boardUrl).toBe("https://trello.com/b/other");
    }
  });

  it("mergedSectionConfig uses empty list names when board.lists is undefined", async () => {
    const viewMissingLists = {
      ...mockBoardView,
      board: { ...mockBoardView.board, lists: undefined as unknown as [] },
    };
    getTeamBoardMock.mockResolvedValue({ ok: true, view: viewMissingLists, sectionConfig: { X: "backlog" } });

    const { result } = renderHook(() => useTeamBoardState(10));

    await waitFor(() => {
      expect(result.current.state.status).toBe("board");
    });
    expect(result.current.mergedSectionConfig).toEqual({});
  });
});
