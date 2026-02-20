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

  //Authorisation URL generation

  it("builds a valid authorise URL", () => {
    const url = TrelloService.getAuthoriseUrl();

    expect(url).toContain("https://trello.com/1/authorize");
    expect(url).toContain(`key=${process.env.TRELLO_KEY}`);
    expect(url).toContain("return_url=");
  });

  //Ensures fallback defaults are used if env vars are missing
  it("uses default app name and base URL when env vars are missing", () => {
    process.env.TRELLO_KEY = "test-key";
    delete process.env.TRELLO_APP_NAME;
    delete process.env.APP_BASE_URL;

    const url = TrelloService.getAuthoriseUrl();

    expect(url).toContain("name=TeamFeedback2Keys");
    expect(url).toContain(
      encodeURIComponent("http://localhost:3001/trello-test/callback")
    );
  });

  //Ensures trailing slash is cleaned up correctly
  it("removes trailing slash from APP_BASE_URL", () => {
    process.env.TRELLO_KEY = "test-key";
    process.env.TRELLO_APP_NAME = "MyApp";
    process.env.APP_BASE_URL = "http://localhost:4000/";

    const url = TrelloService.getAuthoriseUrl();

    expect(url).toContain(
      encodeURIComponent("http://localhost:4000/trello-test/callback")
    );
  });

  it("uses custom APP_BASE_URL and TRELLO_APP_NAME", () => {
    process.env.TRELLO_KEY = "test-key";
    process.env.TRELLO_APP_NAME = "CustomApp";
    process.env.APP_BASE_URL = "https://myapp.com";

    const url = TrelloService.getAuthoriseUrl();

    expect(url).toContain("name=CustomApp");
    expect(url).toContain(
      encodeURIComponent("https://myapp.com/trello-test/callback")
    );
  });

  //Covers both requireTrelloKey and null check
  it("throws if TRELLO_KEY is missing", () => {
    delete process.env.TRELLO_KEY;

    expect(() => TrelloService.getAuthoriseUrl()).toThrow(
      "Trello is not configured on this server"
    );
  });

  it("throws if requireTrelloKey returns empty string", () => {
    process.env.TRELLO_KEY = "";

    expect(() => TrelloService.getAuthoriseUrl()).toThrow(
      "Trello is not configured on this server."
    );
  });

  //Directs Trello api calls
  it("getUserBoards fetches boards successfully", async () => {
    const mockBoards = [{ id: "1", name: "Board 1" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBoards,
    } as any);

    const result = await TrelloService.getUserBoards("token123");

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/members/me/boards?key=${process.env.TRELLO_KEY}&token=token123`
    );

    expect(result).toEqual(mockBoards);
  });

  it("getUserBoards throws on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(
      TrelloService.getUserBoards("token123")
    ).rejects.toThrow("Failed to fetch boards");
  });

  it("getBoardWithData fetches board data", async () => {
    const mockBoard = { id: "board1" };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBoard,
    } as any);

    const result = await TrelloService.getBoardWithData(
      "board1",
      "token123"
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/boards/board1?lists=open&cards=open&key=${process.env.TRELLO_KEY}&token=token123`
    );

    expect(result).toEqual(mockBoard);
  });

  it("getBoardWithData throws on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(
      TrelloService.getBoardWithData("board1", "token123")
    ).rejects.toThrow("Failed to fetch board");
  });

  it("fetches Trello member", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "member1" }),
    } as any);

    const result = await TrelloService.getTrelloMember("token123");

    expect(result).toEqual({ id: "member1" });
  });

  it("throws if member fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(
      TrelloService.getTrelloMember("token123")
    ).rejects.toThrow("Failed to fetch Trello member");
  });

  //OAuth completion
  it("saves user token after OAuth", async () => {
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

  it("throws if OAuth token missing", async () => {
    await expect(
      TrelloService.completeOauthCallback(1, "")
    ).rejects.toThrow("Missing token");
  });

  it("completeOauthCallback throws if userId missing", async () => {
    await expect(
      TrelloService.completeOauthCallback(0 as any, "token123")
    ).rejects.toThrow("Missing userId");
  });

  it("completeOauthCallback throws if member id missing", async () => {
    vi.spyOn(TrelloService, "getTrelloMember").mockResolvedValue({} as any);

    await expect(
      TrelloService.completeOauthCallback(1, "token123")
    ).rejects.toThrow("Failed to fetch Trello member");
  });

  //Assign board to team
  it("assigns board if owner owns it", async () => {
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

  it("throws if board not owned", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloToken: "ownerToken",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "otherBoard" },
    ] as any);

    await expect(
      TrelloService.assignBoardToTeam(2, "board1", 1)
    ).rejects.toThrow("Board does not belong to owner");
  });

  it("assignBoardToTeam throws if missing parameters", async () => {
    await expect(
      TrelloService.assignBoardToTeam(0 as any, "", 0 as any)
    ).rejects.toThrow("Missing teamId, boardId, or ownerId");
  });

  it("assignBoardToTeam throws if owner not connected", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloToken: null,
    });

    await expect(
      TrelloService.assignBoardToTeam(1, "board1", 1)
    ).rejects.toThrow("Owner is not connected to Trello");
  });

  //Fetches assigned team board
  it("fetches team board if member", async () => {
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

  it("throws if not team member", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);

    await expect(
      TrelloService.fetchAssignedTeamBoard(2, 1)
    ).rejects.toThrow("Not a member of this team");
  });

  it("throws if no board assigned", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      trelloBoardId: null,
    });

    await expect(
      TrelloService.fetchAssignedTeamBoard(1, 1)
    ).rejects.toThrow("No board assigned");
  });

  it("throws if owner not connected", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: null },
    });

    await expect(
      TrelloService.fetchAssignedTeamBoard(1, 1)
    ).rejects.toThrow("Team owner not connected to Trello");
  });

  // Fetches personal boards

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

  it("throws if user not connected", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: null,
    });

    await expect(
      TrelloService.fetchMyBoards(1)
    ).rejects.toThrow("User not connected to Trello");
  });

  //fetches a board by ID
  it("fetches board if belongs to user", async () => {
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

  it("throws if boardId missing", async () => {
    await expect(
      TrelloService.fetchBoardById(1, "")
    ).rejects.toThrow("Missing boardId");
  });

  it("throws if user not connected", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: null,
    });

    await expect(
      TrelloService.fetchBoardById(1, "board1")
    ).rejects.toThrow("User not connected to Trello");
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
