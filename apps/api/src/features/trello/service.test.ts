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
    setTeamTrelloSectionConfig: vi.fn(),
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
    const callbackUrl = "http://localhost:3001/projects/1/trello/callback";
    const url = TrelloService.getAuthoriseUrl(callbackUrl);

    expect(url).toContain("https://trello.com/1/authorize");
    expect(url).toContain(`key=${process.env.TRELLO_KEY}`);
    expect(url).toContain(encodeURIComponent(callbackUrl));
  });

  //Ensures fallback defaults are used if env vars are missing. Uses project callback URL (frontend should always pass this).
  it("uses default app name and base URL when env vars are missing", () => {
    process.env.TRELLO_KEY = "test-key";
    delete process.env.TRELLO_APP_NAME;
    delete process.env.APP_BASE_URL;

    const projectCallbackUrl = "http://localhost:3001/projects/123/trello/callback";
    const url = TrelloService.getAuthoriseUrl(projectCallbackUrl);

    expect(url).toContain("name=TeamFeedback2Keys");
    expect(url).toContain(encodeURIComponent(projectCallbackUrl));
  });

  //Ensures trailing slash is cleaned up correctly
  it("removes trailing slash from APP_BASE_URL", () => {
    process.env.TRELLO_KEY = "test-key";
    process.env.TRELLO_APP_NAME = "MyApp";
    process.env.APP_BASE_URL = "http://localhost:4000/";

    const projectCallbackUrl = "http://localhost:4000/projects/1/trello/callback";
    const url = TrelloService.getAuthoriseUrl(projectCallbackUrl);

    expect(url).toContain(encodeURIComponent(projectCallbackUrl));
  });

  it("uses custom APP_BASE_URL and TRELLO_APP_NAME with project callback URL", () => {
    process.env.TRELLO_KEY = "test-key";
    process.env.TRELLO_APP_NAME = "CustomApp";
    process.env.APP_BASE_URL = "https://myapp.com";

    const projectCallbackUrl = "https://myapp.com/projects/99/trello/callback";
    const url = TrelloService.getAuthoriseUrl(projectCallbackUrl);

    expect(url).toContain("name=CustomApp");
    expect(url).toContain(encodeURIComponent(projectCallbackUrl));
  });

  it("uses provided callbackUrl when valid", () => {
    process.env.TRELLO_KEY = "test-key";
    process.env.APP_BASE_URL = "https://myapp.com";

    const customCallback = "https://myapp.com/projects/42/trello/callback";
    const url = TrelloService.getAuthoriseUrl(customCallback);

    expect(url).toContain(encodeURIComponent(customCallback));
  });

  it("throws if callbackUrl is missing or invalid", () => {
    expect(() => TrelloService.getAuthoriseUrl(undefined as any)).toThrow(
      "Valid callback URL is required"
    );
    expect(() => TrelloService.getAuthoriseUrl("")).toThrow(
      "Valid callback URL is required"
    );
    expect(() => TrelloService.getAuthoriseUrl("/projects/1/trello/callback")).toThrow(
      "Valid callback URL is required"
    );
  });

  it("throws if TRELLO_KEY is missing", () => {
    delete process.env.TRELLO_KEY;
    const callbackUrl = "http://localhost:3001/projects/1/trello/callback";

    expect(() => TrelloService.getAuthoriseUrl(callbackUrl)).toThrow(
      "Trello is not configured on this server"
    );
  });

  it("throws if requireTrelloKey returns empty string", () => {
    process.env.TRELLO_KEY = "";
    const callbackUrl = "http://localhost:3001/projects/1/trello/callback";

    expect(() => TrelloService.getAuthoriseUrl(callbackUrl)).toThrow(
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
    const mockActions = [{ id: "act1", type: "createCard" }];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoard,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockActions,
      } as any);

    global.fetch = fetchMock as any;

    const result = await TrelloService.getBoardWithData(
      "board1",
      "token123"
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const boardUrl = (global.fetch as any).mock.calls[0][0];
    expect(boardUrl).toContain("https://api.trello.com/1/boards/board1?");
    expect(boardUrl).toContain("lists=open");
    expect(boardUrl).toContain("cards=open");
    expect(boardUrl).toContain("members=all");
    expect(boardUrl).toContain("key=test-key");
    expect(boardUrl).toContain("token=token123");

    expect(result).toEqual({ ...mockBoard, actions: [] });
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
      trelloSectionConfig: null,
    });

    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 1);

    expect(result).toEqual({ board: { id: "board1" }, sectionConfig: {} });
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

  // assertTeamMember

  it("assertTeamMember does not throw when user is in team", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);

    await expect(
      TrelloService.assertTeamMember(2, 1)
    ).resolves.toBeUndefined();
    expect(TrelloRepo.isUserInTeam).toHaveBeenCalledWith(1, 2);
  });

  it("assertTeamMember throws when user is not in team", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);

    await expect(
      TrelloService.assertTeamMember(2, 1)
    ).rejects.toThrow("Not a member of this team");
  });

  // updateTeamTrelloSectionConfig

  it("updateTeamTrelloSectionConfig saves normalized config when user is member", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.setTeamTrelloSectionConfig as any).mockResolvedValue(undefined);

    const config = { "To Do": "backlog", "Done": "completed" };
    await TrelloService.updateTeamTrelloSectionConfig(2, 1, config);

    expect(TrelloRepo.isUserInTeam).toHaveBeenCalledWith(1, 2);
    expect(TrelloRepo.setTeamTrelloSectionConfig).toHaveBeenCalledWith(
      2,
      { "To Do": "backlog", "Done": "completed" }
    );
  });

  it("updateTeamTrelloSectionConfig strips non-string values only", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.setTeamTrelloSectionConfig as any).mockResolvedValue(undefined);

    await TrelloService.updateTeamTrelloSectionConfig(2, 1, {
      "List A": "backlog",
      "List B": 123 as any,
      "List C": "work_in_progress",
    });

    expect(TrelloRepo.setTeamTrelloSectionConfig).toHaveBeenCalledWith(
      2,
      { "List A": "backlog", "List C": "work_in_progress" }
    );
  });

  it("updateTeamTrelloSectionConfig throws when user is not team member", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);

    await expect(
      TrelloService.updateTeamTrelloSectionConfig(2, 1, { "To Do": "backlog" })
    ).rejects.toThrow("Not a member of this team");
    expect(TrelloRepo.setTeamTrelloSectionConfig).not.toHaveBeenCalled();
  });
});
