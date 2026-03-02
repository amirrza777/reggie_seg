import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetch } from "@/shared/api/http";
import {
  getConnectUrl,
  getLinkToken,
  getTeamBoard,
  getMyBoards,
  assignBoardToTeam,
  getBoardById,
  completeTrelloLinkWithToken,
} from "./client";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/features/auth/api/client", () => ({
  refreshAccessToken: vi.fn(),
}));

describe("trello api client", () => {
  const apiFetchMock = vi.mocked(apiFetch);

  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({} as any);
  });

  it("getConnectUrl with callbackUrl appends encoded query param", async () => {
    apiFetchMock.mockResolvedValue({ url: "https://trello.com/1/authorize?..." } as any);

    await getConnectUrl("https://app.com/projects/99/trello/callback");

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/trello/connect-url?callbackUrl=" + encodeURIComponent("https://app.com/projects/99/trello/callback"),
      { method: "GET" }
    );
  });

  it("getConnectUrl without callbackUrl calls connect-url with no query", async () => {
    apiFetchMock.mockResolvedValue({ url: "https://trello.com/1/authorize?..." } as any);

    await getConnectUrl();

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/connect-url", { method: "GET" });
  });

  it("getLinkToken calls /trello/link-token", async () => {
    apiFetchMock.mockResolvedValue({ linkToken: "token123" } as any);

    await getLinkToken();

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/link-token", { method: "GET" });
  });

  it("getTeamBoard calls team-board with teamId", async () => {
    apiFetchMock.mockResolvedValue({ id: "board1", lists: [], cards: [], members: [], actions: [] } as any);

    await getTeamBoard(42);

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/team-board?teamId=42", { method: "GET" });
  });

  it("getMyBoards calls /trello/boards", async () => {
    apiFetchMock.mockResolvedValue([{ id: "b1", name: "Board 1" }] as any);

    const result = await getMyBoards();

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/boards", { method: "GET" });
    expect(result).toEqual([{ id: "b1", name: "Board 1" }]);
  });

  it("assignBoardToTeam POSTs teamId and boardId", async () => {
    apiFetchMock.mockResolvedValue({ message: "Board assigned" } as any);

    await assignBoardToTeam(10, "board-id-123");

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/assign", {
      method: "POST",
      body: JSON.stringify({ teamId: 10, boardId: "board-id-123" }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("getBoardById calls /trello/boards/:boardId", async () => {
    apiFetchMock.mockResolvedValue({
      id: "board1",
      lists: [],
      cards: [],
      members: [],
      actions: [],
    } as any);

    await getBoardById("board1");

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/boards/board1", { method: "GET" });
  });

  it("completeTrelloLinkWithToken POSTs linkToken and token with auth false", async () => {
    apiFetchMock.mockResolvedValue({ ok: true } as any);

    await completeTrelloLinkWithToken("link-token-123", "trello-token-456");

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/callback-with-link-token", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ linkToken: "link-token-123", token: "trello-token-456" }),
    });
  });
});
