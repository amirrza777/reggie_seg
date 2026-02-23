import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloController } from "./controller.js";
import { TrelloService } from "./service.js";

//mock service layer
vi.mock("./service.js", () => ({
  TrelloService: {
    getAuthoriseUrl: vi.fn(),
    completeOauthCallback: vi.fn(),
    assignBoardToTeam: vi.fn(),
    fetchAssignedTeamBoard: vi.fn(),
    fetchMyBoards: vi.fn(),
    fetchBoardById: vi.fn(),
  },
}));

//Reusable mock express response object
function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  return res;
}

describe("TrelloController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //Get connect url

  it("returns connect URL as JSON when service succeeds", () => {
    //Service gives a Trello authorisation URL
    (TrelloService.getAuthoriseUrl as any).mockReturnValue("http://trello-url");

    const req: any = {};
    const res = createMockRes();

    TrelloController.getConnectUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: "http://trello-url" });
  });

  it("returns 503 if URL generation throws an error", () => {
    //Simulates service failure
    (TrelloService.getAuthoriseUrl as any).mockImplementation(() => {
      throw new Error("Failure");
    });

    const req: any = {};
    const res = createMockRes();

    TrelloController.getConnectUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: "Failure" });
  });

  //Browser redirect

  it("redirects browser to Trello authorisation URL", () => {
    (TrelloService.getAuthoriseUrl as any).mockReturnValue("http://trello-url");

    const req: any = {};
    const res = createMockRes();

    TrelloController.connect(req, res);

    expect(res.redirect).toHaveBeenCalledWith("http://trello-url");
  });

  it("returns 503 if redirect URL generation fails", () => {
    (TrelloService.getAuthoriseUrl as any).mockImplementation(() => {
      throw new Error("Failure");
    });

    const req: any = {};
    const res = createMockRes();

    TrelloController.connect(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  //OAUTH callback (POST)

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
    //Covers the ?? "" fallback branch
    (TrelloService.completeOauthCallback as any).mockRejectedValue(
      new Error("Missing token")
    );

    const req: any = {
      body: {}, // token undefined
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

  //assigns board to a team

  it("assigns board successfully when inputs are valid", async () => {
    (TrelloService.assignBoardToTeam as any).mockResolvedValue(undefined);

    const req: any = {
      body: { teamId: 2, boardId: "board1" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.assignBoardToTeam(req, res);

    expect(TrelloService.assignBoardToTeam).toHaveBeenCalledWith(
      2,
      "board1",
      1
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 if teamId or boardId missing", async () => {
    const req: any = {
      body: { teamId: null, boardId: "" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.assignBoardToTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 if boardId is undefined (covers ?? fallback)", async () => {
    const req: any = {
      body: { teamId: 100000 }, // boardId undefined
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.assignBoardToTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing teamId or boardId",
    });
  });

  it("returns 400 if service throws while assigning board", async () => {
    (TrelloService.assignBoardToTeam as any).mockRejectedValue(
      new Error("Failure")
    );

    const req: any = {
      body: { teamId: 2, boardId: "board1" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.assignBoardToTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  //fetches assigned team board

  it("returns assigned team board when found", async () => {
    (TrelloService.fetchAssignedTeamBoard as any).mockResolvedValue({
      id: "board1",
    });

    const req: any = {
      query: { teamId: "2" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.fetchAssignedTeamBoard(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "board1" });
  });

  it("returns 400 if teamId is missing", async () => {
    const req: any = {
      query: {},
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.fetchAssignedTeamBoard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 if service throws while fetching assigned board", async () => {
    (TrelloService.fetchAssignedTeamBoard as any).mockRejectedValue(
      new Error("Service failure")
    );

    const req: any = {
      query: { teamId: "2" },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.fetchAssignedTeamBoard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Service failure" });
  });

  //fetches current user's Trello boards

  it("returns boards for logged in user", async () => {
    (TrelloService.fetchMyBoards as any).mockResolvedValue([{ id: "b1" }]);

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.fetchMyBoards(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: "b1" }]);
  });

  it("returns 400 if service fails while fetching boards", async () => {
    (TrelloService.fetchMyBoards as any).mockRejectedValue(
      new Error("Failure")
    );

    const req: any = { user: { sub: 1 } };
    const res = createMockRes();

    await TrelloController.fetchMyBoards(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  //Fetches a board by id

  it("returns board by id", async () => {
    (TrelloService.fetchBoardById as any).mockResolvedValue({
      id: "board1",
    });

    const req: any = {
      user: { sub: 1 },
      params: { boardId: "board1" },
    };
    const res = createMockRes();

    await TrelloController.fetchBoardById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "board1" });
  });

  it("returns 400 if service throws while fetching board by id", async () => {
    (TrelloService.fetchBoardById as any).mockRejectedValue(
      new Error("Failure")
    );

    const req: any = {
      user: { sub: 1 },
      params: { boardId: "board1" },
    };
    const res = createMockRes();

    await TrelloController.fetchBoardById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
