import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  StaffProjectTrelloContent,
  type StaffTrelloContentViewProps,
} from "./StaffProjectTrelloContent";
import type { BoardView } from "@/features/trello/api/client";

const useTrelloBoardMock = vi.fn();
const useTeamBoardStateMock = vi.fn();
const usePathnameMock = vi.fn();
const getMyBoardsMock = vi.fn();

vi.mock("@/features/trello/context/TrelloBoardContext", () => ({
  useTrelloBoard: () => useTrelloBoardMock(),
}));

vi.mock("@/features/trello/hooks/useTeamBoardState", () => ({
  useTeamBoardState: (...args: unknown[]) => useTeamBoardStateMock(...args),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/features/staff/projects/components/navigation/navBasePath", () => ({
  resolveStaffTeamBasePath: () => "/staff/projects/9/teams/4",
}));

vi.mock("@/features/trello/api/client", () => ({
  getMyBoards: () => getMyBoardsMock(),
}));

const mockView: BoardView = {
  board: {
    id: "b1",
    name: "Team B",
    lists: [],
    members: [],
    url: "https://trello.com/b/z",
  },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

const StubView: ComponentType<StaffTrelloContentViewProps> = (props) => (
  <div data-testid="staff-inner">
    <button type="button" onClick={props.onRequestChangeBoard}>
      Change board
    </button>
    <button type="button" onClick={props.onRequestChangeAccount!}>
      Change account
    </button>
  </div>
);

function setSource(state: Record<string, unknown>, merged: Record<string, string> = {}) {
  useTrelloBoardMock.mockReturnValue(null);
  useTeamBoardStateMock.mockReturnValue({
    state,
    setState: vi.fn(),
    mergedSectionConfig: merged,
  });
}

describe("StaffProjectTrelloContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/staff/projects/9/teams/4/trello");
  });

  it("passes staffView true to useTeamBoardState", () => {
    setSource({ status: "loading" });
    render(
      <StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />,
    );
    expect(useTeamBoardStateMock).toHaveBeenCalledWith(4, { staffView: true });
  });

  it("covers loading, error, no board, link-board, link-account states", () => {
    setSource({ status: "loading" });
    const { rerender } = render(
      <StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />,
    );
    expect(screen.getByText(/loading trello/i)).toBeInTheDocument();

    setSource({ status: "error", message: "E" });
    rerender(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    expect(screen.getByText("E")).toBeInTheDocument();

    setSource({ status: "no-team-board" });
    rerender(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    expect(screen.getByText(/does not have a Trello board linked yet/i)).toBeInTheDocument();

    setSource({ status: "link-board", boards: [] });
    rerender(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    expect(screen.getByText(/does not have a Trello board linked yet/i)).toBeInTheDocument();

    setSource({ status: "link-account" });
    rerender(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("join-board shows link when boardUrl present", () => {
    setSource({ status: "join-board", boardUrl: "https://trello.com/b/j" });
    render(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    expect(screen.getByRole("link", { name: /open the board in trello/i })).toHaveAttribute(
      "href",
      "https://trello.com/b/j",
    );
  });

  it("join-board omits link when boardUrl missing", () => {
    setSource({ status: "join-board", boardUrl: "" });
    render(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    expect(screen.queryByRole("link", { name: /open the board in trello/i })).not.toBeInTheDocument();
  });

  it("renders nav and spreads viewExtraProps into view", () => {
    setSource({ status: "board", view: mockView, sectionConfig: {} }, { L: "backlog" });
    render(
      <StaffProjectTrelloContent
        projectId="9"
        teamId={4}
        moduleId="12"
        viewComponent={StubView}
        viewExtraProps={{ filterVariant: "staff", integrationsReadOnly: true }}
      />,
    );
    expect(screen.getByTestId("staff-inner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/4/trello/board",
    );
  });

  it("getMyBoards success and failure from change handlers", async () => {
    const user = userEvent.setup();
    const setState = vi.fn();
    useTeamBoardStateMock.mockReturnValue({
      state: { status: "board", view: mockView, sectionConfig: {} },
      setState,
      mergedSectionConfig: {},
    });
    getMyBoardsMock.mockResolvedValueOnce([{ id: "1", name: "B" }]);
    render(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    await user.click(screen.getByRole("button", { name: /change board/i }));
    expect(setState).toHaveBeenCalledWith({ status: "link-board", boards: [{ id: "1", name: "B" }] });

    getMyBoardsMock.mockRejectedValueOnce(new Error("nope"));
    await user.click(screen.getByRole("button", { name: /change board/i }));
    expect(setState).toHaveBeenCalledWith({ status: "error", message: "nope" });

    getMyBoardsMock.mockRejectedValueOnce("not-an-error");
    await user.click(screen.getByRole("button", { name: /change board/i }));
    expect(setState).toHaveBeenCalledWith({ status: "error", message: "Failed to load your boards." });
  });

  it("change account handler sets link-account state", async () => {
    const user = userEvent.setup();
    const setState = vi.fn();
    useTeamBoardStateMock.mockReturnValue({
      state: { status: "board", view: mockView, sectionConfig: {} },
      setState,
      mergedSectionConfig: {},
    });
    render(<StaffProjectTrelloContent projectId="9" teamId={4} viewComponent={StubView} />);
    await user.click(screen.getByRole("button", { name: /change account/i }));
    expect(setState).toHaveBeenCalledWith({ status: "link-account" });
  });
});
