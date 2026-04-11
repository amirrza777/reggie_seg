import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TrelloBoardView } from "./TrelloBoardView";
import type { BoardView } from "@/features/trello/api/client";
import type { TrelloBoardAction, TrelloCard } from "@/features/trello/types";

const getMyTrelloMemberIdMock = vi.fn();

vi.mock("@/features/trello/api/client", () => ({
  getMyTrelloMemberId: () => getMyTrelloMemberIdMock(),
}));

function pastDateKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildView(changeDateKeys: string[], overrides: Partial<BoardView> = {}): BoardView {
  const lists = [
    { id: "l1", name: "Backlog" },
    { id: "l2", name: "Done" },
  ];
  const cardsByList: Record<string, TrelloCard[]> = {
    l1: [
      {
        id: "c1",
        name: "Task",
        idList: "l1",
        members: [{ id: "m1", fullName: "Alex", initials: "A" }],
      },
    ],
    l2: [],
  };
  const sortedKeys = [...changeDateKeys].sort((a, b) => a.localeCompare(b));
  const actionsByDate: Record<string, TrelloBoardAction[]> = {};
  sortedKeys.forEach((key, i) => {
    actionsByDate[key] = [
      {
        id: `a${i}`,
        type: "createCard",
        date: `${key}T12:00:00.000Z`,
        data: { card: { id: "c1", name: "Task" }, list: { id: "l1" } },
      } as TrelloBoardAction,
    ];
  });
  return {
    board: {
      id: "b1",
      name: "Board",
      lists,
      members: [
        { id: "m1", fullName: "Alex A", initials: "AA" },
        { id: "m2", fullName: "Blake", initials: "B" },
      ],
      url: "",
      ...overrides.board,
    },
    listNamesById: { l1: "Backlog", l2: "Done" },
    actionsByDate,
    cardsByList,
    ...overrides,
  };
}

describe("TrelloBoardView", () => {
  const older = pastDateKey(12);
  const newer = pastDateKey(5);
  const changeKeys = [older, newer].sort((a, b) => a.localeCompare(b));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables My tasks when trello member id is null", async () => {
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: null });
    render(<TrelloBoardView view={buildView(changeKeys)} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /my tasks/i })).toBeDisabled());
  });

  it("enables My tasks when trello member id is present", async () => {
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: "m1" });
    render(<TrelloBoardView view={buildView(changeKeys)} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /my tasks/i })).not.toBeDisabled());
  });

  it("swallows getMyTrelloMemberId errors", async () => {
    getMyTrelloMemberIdMock.mockRejectedValue(new Error("x"));
    render(<TrelloBoardView view={buildView(changeKeys)} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /my tasks/i })).toBeDisabled());
  });

  it("filters to my tasks when selected", async () => {
    const user = userEvent.setup();
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: "m1" });
    render(
      <TrelloBoardView
        view={buildView(changeKeys)}
        sectionConfig={{ Backlog: "backlog", Done: "completed" }}
        onRequestChangeBoard={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /my tasks/i })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: /my tasks/i }));
    expect(screen.getAllByText("Task").length).toBeGreaterThanOrEqual(1);
  });

  it("staff variant filters by selected member", async () => {
    const user = userEvent.setup();
    render(
      <TrelloBoardView
        view={buildView(changeKeys)}
        sectionConfig={{}}
        filterVariant="staff"
        onRequestChangeBoard={vi.fn()}
      />,
    );
    const select = screen.getByRole("combobox", { name: /filter by team member/i });
    await user.selectOptions(select, "m2");
    expect(select).toHaveValue("m2");
  });

  it("outer jump arrows step between change days (then inner later returns to current)", async () => {
    const user = userEvent.setup();
    const older = pastDateKey(14);
    const newer = pastDateKey(1);
    const keys = [older, newer].sort((a, b) => a.localeCompare(b));
    render(<TrelloBoardView view={buildView(keys)} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /previous day with changes/i }));
    await user.click(screen.getByRole("button", { name: /previous day with changes/i }));
    expect(await screen.findByText(/Board state as of/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next day with changes/i }));
    expect(await screen.findByText(/Board state as of/i)).toBeInTheDocument();

    const laterDay = screen.getByRole("button", { name: /Later day/i });
    await user.click(laterDay);
    expect(await screen.findByText(/Current board state/i)).toBeInTheDocument();
  });

  it("inner calendar arrows move between current and a recent change day", async () => {
    const user = userEvent.setup();
    const recent = pastDateKey(1);
    render(<TrelloBoardView view={buildView([recent])} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Earlier day/i }));
    expect(await screen.findByText(/Board state as of/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Later day/i }));
    expect(await screen.findByText(/Current board state/i)).toBeInTheDocument();
  });

  it("hides time controls when there are no dated actions", async () => {
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: null });
    const view = buildView(changeKeys, { actionsByDate: {} });
    render(<TrelloBoardView view={view} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByLabelText(/Board state over time/i)).not.toBeInTheDocument();
    });
  });

  it("uses member filter when viewing historical state (my tasks)", async () => {
    const user = userEvent.setup();
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: "m1" });
    const todayStr = new Date().toISOString().slice(0, 10);
    const keys = [pastDateKey(14), todayStr].sort((a, b) => a.localeCompare(b));
    render(<TrelloBoardView view={buildView(keys)} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /my tasks/i })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: /my tasks/i }));
    await user.click(screen.getByRole("button", { name: /previous day with changes/i }));
    await user.click(screen.getByRole("button", { name: /previous day with changes/i }));

    expect(await screen.findByText(/Board state as of/i)).toBeInTheDocument();
    expect(screen.getAllByText("Task").length).toBeGreaterThanOrEqual(1);
  });

  it("inner later returns to current when next calendar day is past today", async () => {
    const user = userEvent.setup();
    getMyTrelloMemberIdMock.mockResolvedValue({ trelloMemberId: null });
    const todayStr = new Date().toISOString().slice(0, 10);
    const keys = [pastDateKey(14), todayStr].sort((a, b) => a.localeCompare(b));
    render(<TrelloBoardView view={buildView(keys)} sectionConfig={{}} onRequestChangeBoard={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /previous day with changes/i }));
    expect(await screen.findByText(/Board state as of/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Later day/i }));
    expect(await screen.findByText(/Current board state/i)).toBeInTheDocument();
  });
});
