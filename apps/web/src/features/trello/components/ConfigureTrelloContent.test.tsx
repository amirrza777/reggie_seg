import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConfigureTrelloContent } from "./ConfigureTrelloContent";

const getTeamBoardMock = vi.fn();
const putTrelloSectionConfigMock = vi.fn();
const useTrelloBoardMock = vi.fn();
const useCanEditMock = vi.fn();
const routerPush = vi.fn();

vi.mock("@/features/trello/api/client", () => ({
  getTeamBoard: (...a: unknown[]) => getTeamBoardMock(...a),
  putTrelloSectionConfig: (...a: unknown[]) => putTrelloSectionConfigMock(...a),
  mergeSectionConfigWithDefaults: (names: string[], saved: Record<string, string>) =>
    Object.fromEntries(names.map((n) => [n, saved[n] ?? "backlog"])),
  TRELLO_SECTION_STATUSES: [
    "information_only",
    "backlog",
    "work_in_progress",
    "completed",
    "unlabelled_status",
  ],
}));

vi.mock("@/features/trello/context/TrelloBoardContext", () => ({
  useTrelloBoard: () => useTrelloBoardMock(),
}));

vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  useProjectWorkspaceCanEdit: () => ({ canEdit: useCanEditMock() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

describe("ConfigureTrelloContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCanEditMock.mockReturnValue(true);
    useTrelloBoardMock.mockReturnValue(null);
  });

  it("shows archived message when cannot edit", () => {
    useCanEditMock.mockReturnValue(false);
    getTeamBoardMock.mockImplementation(() => new Promise(() => {}));
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    expect(screen.getByText(/not available while this project is archived/i)).toBeInTheDocument();
  });

  it("shows load error from requireJoin response", async () => {
    getTeamBoardMock.mockResolvedValue({ ok: false, requireJoin: true, boardUrl: "x" });
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/join the board on Trello first/i);
    });
  });

  it("lists rows and saves configuration", async () => {
    const user = userEvent.setup();
    const loadTeamBoard = vi.fn().mockResolvedValue(undefined);
    useTrelloBoardMock.mockReturnValue({ loadTeamBoard });
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: {
          id: "b",
          name: "B",
          lists: [{ id: "l1", name: "Doing" }],
          members: [],
          url: "",
        },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    putTrelloSectionConfigMock.mockResolvedValue({ ok: true });

    render(<ConfigureTrelloContent projectId="1" teamId={2} />);

    await waitFor(() => expect(screen.getByText("Doing")).toBeInTheDocument());

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "completed");
    await user.click(screen.getByRole("button", { name: /save and view board/i }));

    await waitFor(() => {
      expect(putTrelloSectionConfigMock).toHaveBeenCalledWith(2, expect.objectContaining({ Doing: "completed" }));
      expect(loadTeamBoard).toHaveBeenCalled();
      expect(routerPush).toHaveBeenCalledWith("/projects/1/trello");
    });
  });

  it("shows empty lists message when board has no lists and no error", async () => {
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: { id: "b", name: "B", lists: [], members: [], url: "" },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => {
      expect(screen.getByText(/No lists found on the board/i)).toBeInTheDocument();
    });
  });

  it("shows generic load error when getTeamBoard throws non-Error", async () => {
    getTeamBoardMock.mockRejectedValueOnce("x");
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to load board.");
    });
  });

  it("shows row select option fallback when status has no label mapping", async () => {
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: { id: "b", name: "B", lists: [{ id: "l", name: "L" }], members: [], url: "" },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
    expect(screen.getByRole("option", { name: "unlabelled_status" })).toBeInTheDocument();
  });

  it("does not apply load results after unmount", async () => {
    let resolveLoad: ((v: unknown) => void) | null = null;
    getTeamBoardMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const { unmount } = render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    unmount();
    resolveLoad?.({
      ok: true,
      view: {
        board: { id: "b", name: "B", lists: [{ id: "l", name: "Late" }], members: [], url: "" },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    await Promise.resolve();
  });

  it("loads lists when board omits lists property", async () => {
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: { id: "b", name: "B", members: [], url: "" } as { id: string; name: string; members: []; url: string },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => {
      expect(screen.getByText(/No lists found on the board/i)).toBeInTheDocument();
    });
  });

  it("save succeeds without loadTeamBoard when context omits it", async () => {
    const user = userEvent.setup();
    useTrelloBoardMock.mockReturnValue(null);
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: { id: "b", name: "B", lists: [{ id: "l", name: "L" }], members: [], url: "" },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    putTrelloSectionConfigMock.mockResolvedValue({ ok: true });
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => expect(screen.getByText("L")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /save and view board/i }));
    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/projects/1/trello");
    });
  });

  it("shows generic save error when put rejects non-Error", async () => {
    const user = userEvent.setup();
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: { id: "b", name: "B", lists: [{ id: "l", name: "L" }], members: [], url: "" },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    putTrelloSectionConfigMock.mockRejectedValueOnce("nope");
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => expect(screen.getByText("L")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /save and view board/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to save configuration.");
    });
  });

  it("shows save error when putTrelloSectionConfig fails", async () => {
    const user = userEvent.setup();
    getTeamBoardMock.mockResolvedValue({
      ok: true,
      view: {
        board: { id: "b", name: "B", lists: [{ id: "l", name: "L" }], members: [], url: "" },
        listNamesById: {},
        actionsByDate: {},
        cardsByList: {},
      },
      sectionConfig: {},
    });
    putTrelloSectionConfigMock.mockRejectedValueOnce(new Error("save bad"));
    render(<ConfigureTrelloContent projectId="1" teamId={2} />);
    await waitFor(() => expect(screen.getByText("L")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /save and view board/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("save bad");
    });
  });
});
