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

describe("TrelloService OAuth and API fetches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRELLO_KEY = "test-key";
    process.env.APP_BASE_URL = "http://localhost:3001";
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

  it("getUserBoards returns [] when API payload is not an array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ not: "array" }),
    } as any);

    await expect(TrelloService.getUserBoards("token123")).resolves.toEqual([]);
  });

  it("getUserBoards filters out non-object entries", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "1", name: "Good" }, null, "bad", 1],
    } as any);

    await expect(TrelloService.getUserBoards("token123")).resolves.toEqual([{ id: "1", name: "Good" }]);
  });

  it("getUserBoards throws on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(
      TrelloService.getUserBoards("token123")
    ).rejects.toThrow("Failed to fetch boards");
  });

  it("getBoardWithData calls Trello board endpoint with expected query params", async () => {
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

    await TrelloService.getBoardWithData("board1", "token123");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const boardUrl = (global.fetch as any).mock.calls[0][0];
    expect(boardUrl).toContain("https://api.trello.com/1/boards/board1?");
    expect(boardUrl).toContain("lists=open");
    expect(boardUrl).toContain("cards=open");
    expect(boardUrl).toContain("members=all");
    expect(boardUrl).toContain("key=test-key");
    expect(boardUrl).toContain("token=token123");
  });

  it("getBoardWithData returns board payload with actions", async () => {
    const mockBoard = { id: "board1" };
    const mockActions = [{ id: "act1", type: "createCard" }];
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoard,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockActions,
      } as any) as any;

    const result = await TrelloService.getBoardWithData("board1", "token123");

    expect(result).toEqual({ ...mockBoard, actions: mockActions });
  });

  it("getBoardWithData throws on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(
      TrelloService.getBoardWithData("board1", "token123")
    ).rejects.toThrow("Failed to fetch board");
  });

  it("getBoardHistory returns [] when Trello actions request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    await expect(TrelloService.getBoardHistory("board1", "token123")).resolves.toEqual([]);
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
});
