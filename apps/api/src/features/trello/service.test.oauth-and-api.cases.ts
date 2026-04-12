import { describe, expect, it } from "vitest";
import {
  beforeEach,
  TrelloRepo,
  TrelloService,
  setupTrelloServiceCaseDefaults,
  vi,
} from "./service.shared-test-helpers.js";

describe("TrelloService", () => {
  beforeEach(() => {
    setupTrelloServiceCaseDefaults();
  });

  it("builds a valid authorise URL", () => {
    const callbackUrl = "http://localhost:3001/projects/1/trello/callback";
    const url = TrelloService.getAuthoriseUrl(callbackUrl);

    expect(url).toContain("https://trello.com/1/authorize");
    expect(url).toContain(`key=${process.env.TRELLO_KEY}`);
    expect(url).toContain(encodeURIComponent(callbackUrl));
  });

  it("uses default app name and base URL when env vars are missing", () => {
    process.env.TRELLO_KEY = "test-key";
    delete process.env.TRELLO_APP_NAME;
    delete process.env.APP_BASE_URL;

    const projectCallbackUrl = "http://localhost:3001/projects/123/trello/callback";
    const url = TrelloService.getAuthoriseUrl(projectCallbackUrl);

    expect(url).toContain("name=TeamFeedback2Keys");
    expect(url).toContain(encodeURIComponent(projectCallbackUrl));
  });

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

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoard,
      } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as any);

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
});
