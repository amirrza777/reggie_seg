import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloService } from "./service.js";
import { TrelloRepo } from "./repo.js";
import { canStaffAccessTeamInProject } from "../projects/team-health-review/repo.js";

vi.mock("../projects/team-health-review/repo.js", () => ({
  canStaffAccessTeamInProject: vi.fn(),
}));

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

const canStaffAccessTeamInProjectMock = vi.mocked(canStaffAccessTeamInProject);

describe("TrelloService team and board operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRELLO_KEY = "test-key";
    process.env.APP_BASE_URL = "http://localhost:3001";
    canStaffAccessTeamInProjectMock.mockResolvedValue(false);
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

  it("fetches team board if member", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);

    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 9,
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

  it("returns requireJoin when user has Trello member id but is not on board", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 9,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: { Todo: "todo" },
    });
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloMemberId: "member-1",
    });

    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
      url: "https://trello.com/b/board1",
      members: [{ id: "member-2" }],
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 1);

    expect(result).toEqual({
      requireJoin: true,
      boardUrl: "https://trello.com/b/board1",
    });
  });

  it("returns object section config when available and user is on board", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 9,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: { Todo: "todo", Doing: "in_progress" },
    });
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 1,
      trelloMemberId: "member-1",
    });

    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
      members: [{ id: "member-1" }],
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 1);

    expect(result).toEqual({
      board: { id: "board1", members: [{ id: "member-1" }] },
      sectionConfig: { Todo: "todo", Doing: "in_progress" },
    });
  });

  it("throws if not team member and not staff for project", async () => {
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 5,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: null,
    });
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);
    canStaffAccessTeamInProjectMock.mockResolvedValue(false);

    await expect(
      TrelloService.fetchAssignedTeamBoard(2, 1)
    ).rejects.toThrow("Not a member of this team");
    expect(canStaffAccessTeamInProjectMock).toHaveBeenCalledWith(1, 5, 2);
  });

  it("fetches team board for staff viewer who is not on the team", async () => {
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 5,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: null,
    });
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);
    canStaffAccessTeamInProjectMock.mockResolvedValue(true);
    (TrelloRepo.getUserById as any).mockResolvedValue({
      id: 99,
      trelloMemberId: "staff-member",
    });

    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
      url: "https://trello.com/b/board1",
      members: [{ id: "student-member" }],
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 99);

    expect(result).toEqual({ board: { id: "board1", url: "https://trello.com/b/board1", members: [{ id: "student-member" }] }, sectionConfig: {} });
  });

  it("throws if no board assigned", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 1,
      trelloBoardId: null,
    });

    await expect(
      TrelloService.fetchAssignedTeamBoard(1, 1)
    ).rejects.toThrow("No board assigned");
  });

  it("throws if owner not connected", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 1,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: null },
    });

    await expect(
      TrelloService.fetchAssignedTeamBoard(1, 1)
    ).rejects.toThrow("Team owner not connected to Trello");
  });

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

  it("applies shared fuzzy matching to board search", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: "token123",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "b1", name: "Example" },
      { id: "b2", name: "Data Structures" },
      { id: "b3", name: "Database Systems" },
    ] as any);

    const droppedLetterMatches = await TrelloService.fetchMyBoards(1, { query: "eampl" });
    expect(droppedLetterMatches.map((board: any) => board.name)).toEqual(["Example"]);

    const shortPrefixMatches = await TrelloService.fetchMyBoards(1, { query: "daa" });
    expect(shortPrefixMatches.map((board: any) => board.name)).toEqual(["Data Structures", "Database Systems"]);
  });

  it("handles boards with non-string names/ids while searching", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: "token123",
    });

    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: 99, name: 123 },
      { id: "board-abc", name: "Readable Board" },
    ] as any);

    const byId = await TrelloService.fetchMyBoards(1, { query: "board-abc" });
    expect(byId).toEqual([{ id: "board-abc", name: "Readable Board" }]);
  });

  it("returns all boards when search query is whitespace", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: "token123",
    });
    vi.spyOn(TrelloService, "getUserBoards").mockResolvedValue([
      { id: "b1", name: "One" },
      { id: "b2", name: "Two" },
    ] as any);

    const result = await TrelloService.fetchMyBoards(1, { query: "   " });
    expect(result).toEqual([
      { id: "b1", name: "One" },
      { id: "b2", name: "Two" },
    ]);
  });

  it("throws if user not connected", async () => {
    (TrelloRepo.getUserById as any).mockResolvedValue({
      trelloToken: null,
    });

    await expect(
      TrelloService.fetchMyBoards(1)
    ).rejects.toThrow("User not connected to Trello");
  });

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
