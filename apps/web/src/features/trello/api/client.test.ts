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
  putTrelloSectionConfig,
  getMyTrelloMemberId,
  getMyTrelloProfile,
  mergeSectionConfigWithDefaults,
  getDefaultStatusForListName,
  rawBoardToBoardView,
} from "./client";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
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
    const board = { id: "board1", lists: [], cards: [], members: [], actions: [] };
    apiFetchMock.mockResolvedValue({ board, sectionConfig: {} } as any);

    const result = await getTeamBoard(42);

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/team-board?teamId=42", { method: "GET" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.board).toEqual(board);
      expect(result.sectionConfig).toEqual({});
    }
  });

  it("getTeamBoard returns requireJoin when API signals join required", async () => {
    apiFetchMock.mockResolvedValue({
      requireJoin: true,
      boardUrl: "https://trello.com/b/join-here",
    } as any);

    const result = await getTeamBoard(1);

    expect(result).toEqual({
      ok: false,
      requireJoin: true,
      boardUrl: "https://trello.com/b/join-here",
    });
  });

  it("getTeamBoard uses empty lists when board.lists is undefined", async () => {
    const board = { id: "b1", members: [], url: "" };
    apiFetchMock.mockResolvedValue({ board, sectionConfig: {} } as any);
    const result = await getTeamBoard(3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.view.board.lists).toBeUndefined();
      expect(Object.keys(result.view.cardsByList)).toHaveLength(0);
    }
  });

  it("getTeamBoard coerces non-object sectionConfig to empty object", async () => {
    const board = {
      id: "b1",
      lists: [{ id: "l1", name: "Todo" }],
      cards: [
        { id: "c1", name: "Card", idList: "l1", idMembers: ["m1"], members: [] as any[] },
        { id: "c2", name: "Has members", idList: "l1", members: [{ id: "m2", fullName: "B", initials: "B" }] },
      ],
      members: [{ id: "m1", fullName: "A", initials: "A" }],
      actions: [
        { id: "a2", type: "commentCard", date: "2025-01-01T12:00:00.000Z", data: {} },
        { id: "a1", type: "commentCard", date: "2025-01-02T12:00:00.000Z", data: {} },
      ],
    };
    apiFetchMock.mockResolvedValue({ board, sectionConfig: "invalid" } as any);

    const result = await getTeamBoard(9);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sectionConfig).toEqual({});
      expect(result.view.cardsByList.l1?.[0]?.members).toEqual([{ id: "m1", fullName: "A", initials: "A" }]);
      expect(result.view.cardsByList.l1?.[1]?.members).toEqual([{ id: "m2", fullName: "B", initials: "B" }]);
      expect(result.view.actionsByDate["2025-01-02"]?.[0]?.id).toBe("a1");
    }
  });

  it("getBoardById maps raw board through rawBoardToBoardView", async () => {
    apiFetchMock.mockResolvedValue({
      id: "board1",
      lists: [{ id: "l1", name: "Backlog" }],
      cards: [
        { id: "c1", name: "One", idList: "l1", idMembers: ["m9"], members: [] },
      ],
      members: [{ id: "m9", fullName: "Pat", initials: "P" }],
      actions: [
        { id: "old", type: "createCard", date: "2024-06-01T00:00:00.000Z", data: {} },
        { id: "new", type: "createCard", date: "2024-06-02T00:00:00.000Z", data: {} },
      ],
    } as any);

    const view = await getBoardById("board1");

    expect(view.cardsByList.l1?.[0]?.members).toEqual([{ id: "m9", fullName: "Pat", initials: "P" }]);
    expect(view.actionsByDate["2024-06-02"]?.[0]?.id).toBe("new");
    expect(view.actionsByDate["2024-06-01"]?.[0]?.id).toBe("old");
  });

  it("getMyBoards calls /trello/boards", async () => {
    apiFetchMock.mockResolvedValue([{ id: "b1", name: "Board 1" }] as any);

    const result = await getMyBoards();

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/boards", { method: "GET" });
    expect(result).toEqual([{ id: "b1", name: "Board 1" }]);
  });

  it("getMyBoards with query adds q param", async () => {
    apiFetchMock.mockResolvedValue([] as any);

    await getMyBoards({ query: "  alpha  " });

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/boards?q=alpha", { method: "GET" });
  });

  it("getMyBoards coerces non-array response to empty array", async () => {
    apiFetchMock.mockResolvedValue({ not: "array" } as any);

    const result = await getMyBoards();

    expect(result).toEqual([]);
  });

  it("mergeSectionConfigWithDefaults uses saved valid status or name fallback", () => {
    expect(
      mergeSectionConfigWithDefaults(["Backlog", "Done", "Custom"], {
        Done: "completed",
        Custom: "not-a-valid-status",
      }),
    ).toEqual({
      Backlog: "backlog",
      Done: "completed",
      Custom: "work_in_progress",
    });
  });

  it("mergeSectionConfigWithDefaults treats non-object saved config as empty", () => {
    expect(mergeSectionConfigWithDefaults(["Todo"], null as any)).toEqual({ Todo: "work_in_progress" });
    expect(mergeSectionConfigWithDefaults(["Todo"], undefined)).toEqual({ Todo: "work_in_progress" });
    expect(mergeSectionConfigWithDefaults(["Todo"], "bad" as any)).toEqual({ Todo: "work_in_progress" });
  });

  it("rawBoardToBoardView tolerates missing optional arrays and buckets cards by list", () => {
    const view = rawBoardToBoardView({
      id: "b",
      name: "B",
      lists: [{ id: "l1", name: "Todo" }],
      cards: [
        { id: "c1", name: "One", idList: "l1" },
        { id: "c2", name: "Two", idList: "l1" },
      ],
      actions: [
        { id: "a2", type: "commentCard", date: "2025-01-02T12:00:00.000Z", data: {} },
        { id: "a1", type: "commentCard", date: "2025-01-01T12:00:00.000Z", data: {} },
      ],
    } as any);
    expect(view.cardsByList.l1).toHaveLength(2);
    expect(view.actionsByDate["2025-01-02"]?.[0]?.id).toBe("a2");
    expect(view.listNamesById.l1).toBe("Todo");
  });

  it("rawBoardToBoardView uses empty members when members omitted", () => {
    const view = rawBoardToBoardView({
      id: "b",
      name: "B",
      lists: [],
      cards: [{ id: "c1", name: "C", idList: "l1" }],
    } as any);
    expect(view.cardsByList.l1?.[0]?.members ?? []).toEqual([]);
  });

  it("getDefaultStatusForListName maps backlog and completed names", () => {
    expect(getDefaultStatusForListName("backlog")).toBe("backlog");
    expect(getDefaultStatusForListName("Completed")).toBe("completed");
    expect(getDefaultStatusForListName("Anything else")).toBe("work_in_progress");
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

  it("putTrelloSectionConfig PUTs teamId and config to team-section-config", async () => {
    apiFetchMock.mockResolvedValue({ ok: true } as any);

    const config = { "To Do": "backlog", "Done": "completed" };
    const result = await putTrelloSectionConfig(10, config);

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/team-section-config", {
      method: "PUT",
      body: JSON.stringify({ teamId: 10, config }),
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual({ ok: true });
  });

  it("getMyTrelloMemberId calls /trello/me-member", async () => {
    apiFetchMock.mockResolvedValue({ trelloMemberId: "member-123" } as any);

    const result = await getMyTrelloMemberId();

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/me-member", { method: "GET" });
    expect(result).toEqual({ trelloMemberId: "member-123" });
  });

  it("getMyTrelloProfile calls /trello/me-profile and returns profile", async () => {
    apiFetchMock.mockResolvedValue({
      trelloMemberId: "member-456",
      fullName: "Jane Doe",
      username: "janedoe",
    } as any);

    const result = await getMyTrelloProfile();

    expect(apiFetchMock).toHaveBeenCalledWith("/trello/me-profile", { method: "GET" });
    expect(result).toEqual({
      trelloMemberId: "member-456",
      fullName: "Jane Doe",
      username: "janedoe",
    });
  });

  it("getMyTrelloProfile returns nulls when not linked", async () => {
    apiFetchMock.mockResolvedValue({
      trelloMemberId: null,
      fullName: null,
      username: null,
    } as any);

    const result = await getMyTrelloProfile();

    expect(result.trelloMemberId).toBeNull();
    expect(result.fullName).toBeNull();
    expect(result.username).toBeNull();
  });
});
