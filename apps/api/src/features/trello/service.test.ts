import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloService } from "./service.js";
import { TrelloRepo } from "./repo.js";

vi.mock("./repo.js", () => ({
  TrelloRepo: {
    updateUserTrelloToken: vi.fn(),
    assignBoard: vi.fn(),
    getUserById: vi.fn(),
    getTeamWithOwner: vi.fn(),
    isUserInTeam: vi.fn(),
  },
}));

describe("TrelloService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRELLO_KEY = "test-key";
    process.env.APP_BASE_URL = "http://localhost:3001";
  });

  // -----------------------------
  // getAuthoriseUrl
  // -----------------------------
  it("builds a valid authorise URL", () => {
    const url = TrelloService.getAuthoriseUrl();

    expect(url).toContain("https://trello.com/1/authorize");
    expect(url).toContain("key=test-key");
    expect(url).toContain("return_url=");
  });

  // -----------------------------
  // getTrelloMember
  // -----------------------------
  it("fetches Trello member", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "member1" }),
    } as any);

    const result = await TrelloService.getTrelloMember("token123");

    expect(fetch).toHaveBeenCalled();
    expect(result).toEqual({ id: "member1" });
  });

  it("throws if member fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(
      TrelloService.getTrelloMember("token123")
    ).rejects.toThrow("Failed to fetch Trello member");
  });

  // -----------------------------
  // completeOauthCallback
  // -----------------------------
  it("saves user token after successful OAuth", async () => {
    vi.spyOn(TrelloService, "getTrelloMember").mockResolvedValue({
      id: "member123",
    } as any);

    await TrelloService.completeOauthCallback(1, "token123");

    expect(TrelloRepo.updateUserTrelloToken).toHaveBeenCalledWith(
      1,
      "token123",
      "member123"
    );
  });

  it("throws if token missing", async () => {
    await expect(
      TrelloService.completeOauthCallback(1, "")
    ).rejects.toThrow("Missing token");
  });

  // -----------------------------
  // assignBoardToTeam
  // -----------------------------
  it("assigns board if board belongs to owner", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloToken: "ownerToken",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "board1" },
    ] as any);

    await TrelloService.assignBoardToTeam(2, "board1", 1);

    expect(TrelloRepo.assignBoard).toHaveBeenCalledWith(2, "board1", 1);
  });

  it("throws if board does not belong to owner", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloToken: "ownerToken",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "differentBoard" },
    ] as any);

    await expect(
      TrelloService.assignBoardToTeam(2, "board1", 1)
    ).rejects.toThrow("Board does not belong to owner");
  });

  // -----------------------------
  // fetchAssignedTeamBoard
  // -----------------------------
  it("fetches assigned team board if user is member", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);

    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
    });

    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 1);

    expect(result).toEqual({ id: "board1" });
  });

  it("throws if user is not team member", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);

    await expect(
      TrelloService.fetchAssignedTeamBoard(2, 1)
    ).rejects.toThrow("Not a member of this team");
  });

  // -----------------------------
  // fetchMyBoards
  // -----------------------------
  it("fetches boards for connected user", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: "token123",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "board1" },
    ] as any);

    const result = await TrelloService.fetchMyBoards(1);

    expect(result).toEqual([{ id: "board1" }]);
  });

  // -----------------------------
  // fetchBoardById
  // -----------------------------
  it("fetches board if it belongs to user", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: "token123",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "board1" },
    ] as any);

    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
    } as any);

    const result = await TrelloService.fetchBoardById(1, "board1");

    expect(result).toEqual({ id: "board1" });
  });

  it("throws if board not found for user", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: "token123",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "otherBoard" },
    ] as any);

    await expect(
      TrelloService.fetchBoardById(1, "board1")
    ).rejects.toThrow("Board not found for this user");
  });
});
