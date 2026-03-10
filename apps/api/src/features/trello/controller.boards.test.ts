import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloController } from "./controller.js";
import { TrelloService } from "./service.js";

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

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  return res;
}

describe("TrelloController board endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      body: { teamId: 100000 },
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

  it("saves section config when teamId and config are valid", async () => {
    (TrelloService.updateTeamTrelloSectionConfig as any).mockResolvedValue(undefined);

    const req: any = {
      body: {
        teamId: 2,
        config: { "To Do": "backlog", "Done": "completed" },
      },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.putTrelloSectionConfig(req, res);

    expect(TrelloService.updateTeamTrelloSectionConfig).toHaveBeenCalledWith(
      2,
      1,
      { "To Do": "backlog", "Done": "completed" }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 400 when teamId or config is missing for section config", async () => {
    const res = createMockRes();

    await TrelloController.putTrelloSectionConfig(
      { body: { teamId: 2 }, user: { sub: 1 } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);

    await TrelloController.putTrelloSectionConfig(
      { body: { teamId: 2, config: null }, user: { sub: 1 } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);

    await TrelloController.putTrelloSectionConfig(
      { body: { teamId: 2, config: [] }, user: { sub: 1 } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when user is not a team member", async () => {
    (TrelloService.updateTeamTrelloSectionConfig as any).mockRejectedValue(
      new Error("Not a member of this team")
    );

    const req: any = {
      body: { teamId: 2, config: { "To Do": "backlog" } },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.putTrelloSectionConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Not a member of this team" });
  });

  it("returns 500 when section config update fails for other reason", async () => {
    (TrelloService.updateTeamTrelloSectionConfig as any).mockRejectedValue(
      new Error("Database error")
    );

    const req: any = {
      body: { teamId: 2, config: { "To Do": "backlog" } },
      user: { sub: 1 },
    };
    const res = createMockRes();

    await TrelloController.putTrelloSectionConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Database error" });
  });

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
