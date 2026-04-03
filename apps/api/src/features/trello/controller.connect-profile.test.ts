import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloController } from "./controller.js";
import { TrelloService } from "./service.js";
import { TrelloRepo } from "./repo.js";

vi.mock("./service.js", () => ({
  TrelloService: {
    getAuthoriseUrl: vi.fn(),
    getTrelloMember: vi.fn(),
    completeOauthCallback: vi.fn(),
    assignBoardToTeam: vi.fn(),
    fetchAssignedTeamBoard: vi.fn(),
    fetchMyBoards: vi.fn(),
    fetchBoardById: vi.fn(),
    updateTeamTrelloSectionConfig: vi.fn(),
  },
}));

vi.mock("./repo.js", () => ({
  TrelloRepo: {
    getUserById: vi.fn(),
  },
}));

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  return res;
}

describe("TrelloController connect/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns trelloMemberId when user has one", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloMemberId: "member-123",
    });

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.getMyTrelloMemberId(req, res);

    expect(TrelloRepo.getUserById).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ trelloMemberId: "member-123" });
  });

  it("returns null trelloMemberId when user has no Trello linked", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({ id: 1, trelloMemberId: null });

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.getMyTrelloMemberId(req, res);

    expect(res.json).toHaveBeenCalledWith({ trelloMemberId: null });
  });

  it("returns 500 when getMyTrelloMemberId lookup fails", async () => {
    (TrelloRepo.getUserById as any).mockRejectedValue(new Error("lookup failed"));

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.getMyTrelloMemberId(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "lookup failed" });
  });

  it("returns 401 when not authenticated for getMyTrelloMemberId", async () => {
    const req: any = { user: null };
    const res = createMockRes();

    await TrelloController.getMyTrelloMemberId(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns Trello profile when user has token", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloToken: "token-abc",
      trelloMemberId: "member-1",
    });
    (TrelloService.getTrelloMember as any).mockResolvedValue({
      id: "member-1",
      fullName: "Jane Doe",
      username: "janedoe",
    });

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.getMyTrelloProfile(req, res);

    expect(TrelloRepo.getUserById).toHaveBeenCalledWith(1);
    expect(TrelloService.getTrelloMember).toHaveBeenCalledWith("token-abc");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      trelloMemberId: "member-1",
      fullName: "Jane Doe",
      username: "janedoe",
    });
  });

  it("returns trelloMemberId null when user has no token", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({ id: 1, trelloToken: null });

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.getMyTrelloProfile(req, res);

    expect(TrelloService.getTrelloMember).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ trelloMemberId: null });
  });

  it("returns 401 when not authenticated for getMyTrelloProfile", async () => {
    const req: any = { user: null };
    const res = createMockRes();

    await TrelloController.getMyTrelloProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 500 when getTrelloMember fails", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloToken: "token-abc",
    });
    (TrelloService.getTrelloMember as any).mockRejectedValue(new Error("Trello API error"));

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.getMyTrelloProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns connect URL as JSON when service succeeds and callbackUrl is provided", () => {
    (TrelloService.getAuthoriseUrl as any).mockReturnValue("http://trello-url");

    const req: any = {
      query: { callbackUrl: "https://app.com/projects/1/trello/callback" },
    };
    const res = createMockRes();

    TrelloController.getConnectUrl(req, res);

    expect(TrelloService.getAuthoriseUrl).toHaveBeenCalledWith(
      "https://app.com/projects/1/trello/callback"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: "http://trello-url" });
  });

  it("returns 400 when callbackUrl query is missing", () => {
    const req: any = { query: {} };
    const res = createMockRes();

    TrelloController.getConnectUrl(req, res);

    expect(TrelloService.getAuthoriseUrl).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)",
    });
  });

  it("returns 400 when callbackUrl is not a valid http(s) URL", () => {
    const req: any = {
      query: { callbackUrl: "/projects/1/trello/callback" },
    };
    const res = createMockRes();

    TrelloController.getConnectUrl(req, res);

    expect(TrelloService.getAuthoriseUrl).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 503 if URL generation throws an error", () => {
    (TrelloService.getAuthoriseUrl as any).mockImplementation(() => {
      throw new Error("Failure");
    });

    const req: any = {
      query: { callbackUrl: "https://app.com/projects/1/trello/callback" },
    };
    const res = createMockRes();

    TrelloController.getConnectUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: "Failure" });
  });

  it("redirects browser to Trello authorisation URL when callbackUrl is provided", () => {
    (TrelloService.getAuthoriseUrl as any).mockReturnValue("http://trello-url");

    const req: any = {
      query: { callbackUrl: "https://app.com/projects/1/trello/callback" },
    };
    const res = createMockRes();

    TrelloController.connect(req, res);

    expect(TrelloService.getAuthoriseUrl).toHaveBeenCalledWith(
      "https://app.com/projects/1/trello/callback"
    );
    expect(res.redirect).toHaveBeenCalledWith("http://trello-url");
  });

  it("returns 400 when callbackUrl is missing for connect redirect", () => {
    const req: any = { query: {} };
    const res = createMockRes();

    TrelloController.connect(req, res);

    expect(TrelloService.getAuthoriseUrl).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 503 if redirect URL generation fails", () => {
    (TrelloService.getAuthoriseUrl as any).mockImplementation(() => {
      throw new Error("Failure");
    });

    const req: any = {
      query: { callbackUrl: "https://app.com/projects/1/trello/callback" },
    };
    const res = createMockRes();

    TrelloController.connect(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("completes OAuth successfully and returns ok", async () => {
    (TrelloService.completeOauthCallback as any).mockResolvedValue(undefined);

    const req: any = {
      body: { token: "token123" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.callback(req, res);

    expect(TrelloService.completeOauthCallback).toHaveBeenCalledWith(
      1,
      "token123"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("handles missing token by passing empty string to service", async () => {
    (TrelloService.completeOauthCallback as any).mockRejectedValue(
      new Error("Missing token")
    );

    const req: any = {
      body: {},
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.callback(req, res);

    expect(TrelloService.completeOauthCallback).toHaveBeenCalledWith(1, "");
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 if OAuth fails", async () => {
    (TrelloService.completeOauthCallback as any).mockRejectedValue(
      new Error("OAuth failed")
    );

    const req: any = {
      body: { token: "bad" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.callback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "OAuth failed" });
  });

  it("returns 405 for unsupported GET callback", () => {
    const req: any = {};
    const res = createMockRes();

    TrelloController.callbackGetUnsupported(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });
});
