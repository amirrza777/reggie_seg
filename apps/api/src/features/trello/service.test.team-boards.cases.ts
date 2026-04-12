import { describe, expect, it } from "vitest";
import {
  beforeEach,
  canStaffAccessTeamInProjectMock,
  TrelloRepo,
  TrelloService,
  setupTrelloServiceCaseDefaults,
  vi,
} from "./service.test.shared.js";

describe("TrelloService", () => {
  beforeEach(() => {
    setupTrelloServiceCaseDefaults();
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

  it("throws if not team member and not staff for project", async () => {
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 5,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: null,
    });
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);

    await expect(
      TrelloService.fetchAssignedTeamBoard(2, 1)
    ).rejects.toThrow("Not a member of this team");
  });

  it("fetches team board for staff viewer who is not a team member", async () => {
    canStaffAccessTeamInProjectMock.mockResolvedValue(true);
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(false);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 9,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: { "To Do": "backlog" },
    });
    (TrelloRepo.getUserById as any).mockResolvedValue({ trelloMemberId: "staff-member" });
    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
      members: [{ id: "student-member" }],
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 99);

    expect(result).toEqual({
      board: { id: "board1", members: [{ id: "student-member" }] },
      sectionConfig: { "To Do": "backlog" },
    });
    expect(canStaffAccessTeamInProjectMock).toHaveBeenCalledWith(99, 9, 2);
  });

  it("returns requireJoin when a team member is not on the linked board but has a Trello identity", async () => {
    (TrelloRepo.isUserInTeam as any).mockResolvedValue(true);
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue({
      projectId: 9,
      trelloBoardId: "board1",
      trelloOwner: { trelloToken: "ownerToken" },
      trelloSectionConfig: null,
    });
    (TrelloRepo.getUserById as any).mockResolvedValue({ trelloMemberId: "userOnTrello" });
    vi.spyOn(TrelloService, "getBoardWithData").mockResolvedValue({
      id: "board1",
      url: "https://trello.com/b/join-here",
      members: [{ id: "someoneElse" }],
    } as any);

    const result = await TrelloService.fetchAssignedTeamBoard(2, 1);

    expect(result).toEqual({ requireJoin: true, boardUrl: "https://trello.com/b/join-here" });
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

  it("throws if team record is missing", async () => {
    (TrelloRepo.getTeamWithOwner as any).mockResolvedValue(null);

    await expect(TrelloService.fetchAssignedTeamBoard(2, 1)).rejects.toThrow("Team not found");
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
