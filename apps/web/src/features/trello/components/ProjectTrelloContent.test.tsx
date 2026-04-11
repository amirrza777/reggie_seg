import type { ComponentType } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProjectTrelloContent, type TrelloBoardContentViewProps } from "./ProjectTrelloContent";
import type { BoardView } from "@/features/trello/api/client";

const useTrelloBoardMock = vi.fn();
const useTeamBoardStateMock = vi.fn();
const useCanEditMock = vi.fn();
const routerReplace = vi.fn();
const getMyBoardsMock = vi.fn();

vi.mock("@/features/trello/context/TrelloBoardContext", () => ({
  useTrelloBoard: () => useTrelloBoardMock(),
}));

vi.mock("@/features/trello/hooks/useTeamBoardState", () => ({
  useTeamBoardState: () => useTeamBoardStateMock(),
}));

vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  useProjectWorkspaceCanEdit: () => ({ canEdit: useCanEditMock() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
  usePathname: () => "/projects/1/trello",
}));

vi.mock("@/features/trello/api/client", () => ({
  getMyBoards: () => getMyBoardsMock(),
}));

vi.mock("@/features/trello/views/TrelloLinkAccountView", () => ({
  TrelloLinkAccountView: () => <div data-testid="link-account-view" />,
}));

vi.mock("@/features/trello/views/TrelloLinkBoardView", () => ({
  TrelloLinkBoardView: () => <div data-testid="link-board-view" />,
}));

vi.mock("@/features/trello/views/TrelloJoinBoardView", () => ({
  TrelloJoinBoardView: () => <div data-testid="join-board-view" />,
}));

const mockView: BoardView = {
  board: {
    id: "b1",
    name: "B",
    lists: [{ id: "l1", name: "L" }],
    members: [],
    url: "https://trello.com/b/x",
  },
  listNamesById: {},
  actionsByDate: {},
  cardsByList: {},
};

const StubView: ComponentType<TrelloBoardContentViewProps> = (props) => (
  <div data-testid="inner-view">
    <button type="button" onClick={props.onRequestChangeBoard}>
      Change team board
    </button>
    {props.onRequestChangeAccount ? (
      <button type="button" onClick={props.onRequestChangeAccount}>
        Change your linked account
      </button>
    ) : null}
  </div>
);

function setSource(overrides: {
  state: Record<string, unknown>;
  setState?: ReturnType<typeof vi.fn>;
  loadTeamBoard?: ReturnType<typeof vi.fn>;
  mergedSectionConfig?: Record<string, string>;
}) {
  const src = {
    state: overrides.state,
    setState: overrides.setState ?? vi.fn(),
    loadTeamBoard: overrides.loadTeamBoard ?? vi.fn().mockResolvedValue(undefined),
    mergedSectionConfig: overrides.mergedSectionConfig ?? {},
  };
  useTrelloBoardMock.mockReturnValue(null);
  useTeamBoardStateMock.mockReturnValue(src);
  return src;
}

describe("ProjectTrelloContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCanEditMock.mockReturnValue(true);
    useTrelloBoardMock.mockReturnValue(null);
  });

  it("uses context source when useTrelloBoard returns a value", () => {
    const ctx = {
      state: { status: "loading" },
      setState: vi.fn(),
      loadTeamBoard: vi.fn(),
      mergedSectionConfig: {},
    };
    useTrelloBoardMock.mockReturnValue(ctx);
    useTeamBoardStateMock.mockReturnValue({ state: { status: "error", message: "wrong" } });
    render(
      <ProjectTrelloContent
        projectId="1"
        teamId={2}
        teamHasLinkedTrelloBoard
        viewComponent={StubView}
      />,
    );
    expect(screen.getByText(/loading trello/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    setSource({ state: { status: "error", message: "Boom" } });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("shows link account for no-team-board when editable", () => {
    setSource({ state: { status: "no-team-board" } });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByTestId("link-account-view")).toBeInTheDocument();
  });

  it("shows link account view when reconnecting account on an editable project", () => {
    useCanEditMock.mockReturnValue(true);
    setSource({ state: { status: "link-account" } });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByTestId("link-account-view")).toBeInTheDocument();
  });

  it("shows archived message for no-team-board when read-only", () => {
    useCanEditMock.mockReturnValue(false);
    setSource({ state: { status: "no-team-board" } });
    render(
      <ProjectTrelloContent
        projectId="1"
        teamId={2}
        teamName="Team A"
        teamHasLinkedTrelloBoard
        viewComponent={StubView}
      />,
    );
    expect(screen.getByText(/Team A did not link a Trello board/i)).toBeInTheDocument();
  });

  it("shows archived copy for link-account when team had board vs not", () => {
    useCanEditMock.mockReturnValue(false);
    setSource({ state: { status: "link-account" } });
    const { rerender } = render(
      <ProjectTrelloContent
        projectId="1"
        teamId={2}
        teamHasLinkedTrelloBoard
        viewComponent={StubView}
      />,
    );
    expect(screen.getByText(/A Trello board is linked for your team/i)).toBeInTheDocument();

    setSource({ state: { status: "link-account" } });
    rerender(
      <ProjectTrelloContent
        projectId="1"
        teamId={2}
        teamHasLinkedTrelloBoard={false}
        viewComponent={StubView}
      />,
    );
    expect(screen.getByText(/Your team did not link a Trello board/i)).toBeInTheDocument();
  });

  it("shows link board or archived stub for link-board", () => {
    useCanEditMock.mockReturnValue(true);
    setSource({ state: { status: "link-board", boards: [] } });
    const { rerender } = render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByTestId("link-board-view")).toBeInTheDocument();

    useCanEditMock.mockReturnValue(false);
    setSource({ state: { status: "link-board", boards: [] } });
    rerender(
      <ProjectTrelloContent
        projectId="1"
        teamId={2}
        teamName="T"
        teamHasLinkedTrelloBoard
        viewComponent={StubView}
      />,
    );
    expect(screen.getByText(/T did not link a Trello board/i)).toBeInTheDocument();
  });

  it("shows join board view", () => {
    setSource({ state: { status: "join-board", boardUrl: "https://trello.com/b/x" } });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByTestId("join-board-view")).toBeInTheDocument();
  });

  it("does not redirect when board has no lists even if section config is empty", () => {
    setSource({
      state: {
        status: "board",
        view: {
          ...mockView,
          board: { ...mockView.board, lists: undefined },
        },
        sectionConfig: {},
      },
    });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByTestId("inner-view")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("redirect stub when board needs default section config", async () => {
    setSource({
      state: {
        status: "board",
        view: {
          ...mockView,
          board: { ...mockView.board, lists: [{ id: "l1", name: "L" }] },
        },
        sectionConfig: {},
      },
    });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByText(/Redirecting to configure/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/projects/1/trello/configure");
    });
  });

  it("renders nav and inner view when board is ready", () => {
    setSource({
      state: { status: "board", view: mockView, sectionConfig: { L: "backlog" } },
      mergedSectionConfig: { L: "backlog" },
    });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByTestId("inner-view")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("href", "/projects/1/trello/board");
  });

  it("does not link board title in nav when board url is only whitespace", () => {
    setSource({
      state: {
        status: "board",
        view: {
          ...mockView,
          board: { ...mockView.board, name: "Solo", url: "   \t  " },
        },
        sectionConfig: { L: "backlog" },
      },
      mergedSectionConfig: { L: "backlog" },
    });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    expect(screen.getByText("Solo")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Solo/ })).not.toBeInTheDocument();
  });

  it("onRequestChangeBoard loads boards or sets error", async () => {
    const user = userEvent.setup();
    const setState = vi.fn();
    getMyBoardsMock.mockResolvedValueOnce([{ id: "b", name: "B" }]);
    setSource({
      state: { status: "board", view: mockView, sectionConfig: { L: "backlog" } },
      setState,
    });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    await user.click(screen.getByRole("button", { name: /change team board/i }));
    expect(setState).toHaveBeenCalledWith({ status: "link-board", boards: [{ id: "b", name: "B" }] });

    getMyBoardsMock.mockRejectedValueOnce("x");
    await user.click(screen.getByRole("button", { name: /change team board/i }));
    expect(setState).toHaveBeenCalledWith({
      status: "error",
      message: "Failed to load your boards.",
    });
  });

  it("change account sets link-account state", async () => {
    const user = userEvent.setup();
    const setState = vi.fn();
    setSource({
      state: { status: "board", view: mockView, sectionConfig: { L: "backlog" } },
      setState,
    });
    render(
      <ProjectTrelloContent projectId="1" teamId={2} teamHasLinkedTrelloBoard viewComponent={StubView} />,
    );
    await user.click(screen.getByRole("button", { name: /change your linked account/i }));
    expect(setState).toHaveBeenCalledWith({ status: "link-account" });
  });
});
