import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isNoBoardAssigned,
  isUserNotConnected,
  isNotMember,
  isOwnerNotConnected,
  loadTeamBoardState,
} from "./teamBoardState";
import { getMyBoards, getTeamBoard } from "../api/client";

vi.mock("../api/client", () => ({
  getTeamBoard: vi.fn(),
  getMyBoards: vi.fn(),
}));

const getTeamBoardMock = vi.mocked(getTeamBoard);
const getMyBoardsMock = vi.mocked(getMyBoards);

const mockBoardView = {
  board: { id: "b1", name: "Board 1", lists: [], members: [], url: "https://trello.com/b/1" },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

describe("teamBoardState", () => {
  describe("error helpers", () => {
    it("isNoBoardAssigned returns true for message containing 'No board assigned'", () => {
      expect(isNoBoardAssigned(new Error("No board assigned"))).toBe(true);
      expect(isNoBoardAssigned("No board assigned")).toBe(true);
      expect(isNoBoardAssigned(new Error("Something else"))).toBe(false);
    });

    it("isUserNotConnected returns true for user not connected messages", () => {
      expect(isUserNotConnected(new Error("User not connected"))).toBe(true);
      expect(isUserNotConnected(new Error("not connected to Trello"))).toBe(true);
      expect(isUserNotConnected("not connected to Trello")).toBe(true);
      expect(isUserNotConnected(new Error("Other"))).toBe(false);
    });

    it("isNotMember returns true for Not a member messages", () => {
      expect(isNotMember(new Error("Not a member of this team"))).toBe(true);
      expect(isNotMember(new Error("Not a member"))).toBe(true);
      expect(isNotMember(new Error("Other"))).toBe(false);
    });

    it("isOwnerNotConnected returns true for owner not connected messages", () => {
      expect(isOwnerNotConnected(new Error("Team owner not connected"))).toBe(true);
      expect(isOwnerNotConnected(new Error("owner not connected"))).toBe(true);
      expect(isOwnerNotConnected(new Error("Other"))).toBe(false);
    });
  });

  describe("loadTeamBoardState", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("sets board state when getTeamBoard returns ok", async () => {
      getTeamBoardMock.mockResolvedValue({ ok: true, view: mockBoardView, sectionConfig: {} });
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenCalledWith({ status: "loading" });
      expect(setState).toHaveBeenCalledWith({
        status: "board",
        view: mockBoardView,
        sectionConfig: {},
      });
      expect(getTeamBoardMock).toHaveBeenCalledWith(10);
    });

    it("sets join-board state when getTeamBoard returns requireJoin", async () => {
      getTeamBoardMock.mockResolvedValue({
        ok: false,
        requireJoin: true,
        boardUrl: "https://trello.com/b/join",
      });
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({
        status: "join-board",
        boardUrl: "https://trello.com/b/join",
      });
    });

    it("sets link-board when No board assigned and getMyBoards succeeds", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
      getMyBoardsMock.mockResolvedValue([{ id: "b1", name: "My Board" }]);
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({
        status: "link-board",
        boards: [{ id: "b1", name: "My Board" }],
      });
    });

    it("sets no-team-board when No board assigned and getMyBoards throws user not connected", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
      getMyBoardsMock.mockRejectedValue(new Error("User not connected to Trello"));
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({ status: "no-team-board" });
    });

    it("sets no-team-board when getMyBoards rejects with not-connected string", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
      getMyBoardsMock.mockRejectedValue("not connected to Trello");
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({ status: "no-team-board" });
    });

    it("sets error with API message when getTeamBoard throws Not a member", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("Not a member of this team"));
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({
        status: "error",
        message: "Not a member of this team",
      });
    });

    it("staffView: sets no-team-board when no board assigned without calling getMyBoards", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
      const setState = vi.fn();

      await loadTeamBoardState(10, setState, { staffView: true });

      expect(getMyBoardsMock).not.toHaveBeenCalled();
      expect(setState).toHaveBeenLastCalledWith({ status: "no-team-board" });
    });

    it("sets error when getTeamBoard throws owner not connected", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("Team owner not connected"));
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({
        status: "error",
        message:
          "The team's Trello board owner has disconnected their account. Ask them to reconnect or assign a new board.",
      });
    });

    it("sets error when No board assigned and getMyBoards fails for other reasons", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
      getMyBoardsMock.mockRejectedValue(new Error("Network failure"));
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({
        status: "error",
        message: "Network failure",
      });
    });

    it("sets link-account when getTeamBoard throws user not connected", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("User not connected to Trello"));
      const setState = vi.fn();

      await loadTeamBoardState(10, setState);

      expect(setState).toHaveBeenLastCalledWith({ status: "link-account" });
    });

    it("uses string fallbacks for errors that are not Error instances", async () => {
      getTeamBoardMock.mockRejectedValue("string fail");
      const setState = vi.fn();
      await loadTeamBoardState(10, setState);
      expect(setState).toHaveBeenLastCalledWith({
        status: "error",
        message: "Failed to load Trello board.",
      });
    });

    it("uses string message when getMyBoards rejects with non-Error", async () => {
      getTeamBoardMock.mockRejectedValue(new Error("No board assigned"));
      getMyBoardsMock.mockRejectedValue("x");
      const setState = vi.fn();
      await loadTeamBoardState(10, setState);
      expect(setState).toHaveBeenLastCalledWith({
        status: "error",
        message: "Failed to load your boards.",
      });
    });
  });
});
