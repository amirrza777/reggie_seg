import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrelloBoardProvider, useTrelloBoard } from "./TrelloBoardContext";

const useTeamBoardStateMock = vi.fn();

vi.mock("@/features/trello/hooks/useTeamBoardState", () => ({
  useTeamBoardState: (teamId: number, options?: { staffView?: boolean }) =>
    useTeamBoardStateMock(teamId, options),
}));

function Consumer() {
  const v = useTrelloBoard();
  return <span data-testid="ctx">{v ? "has" : "null"}</span>;
}

describe("TrelloBoardContext", () => {
  it("provides hook return value from useTeamBoardState without staffView by default", () => {
    useTeamBoardStateMock.mockReturnValue({ state: { status: "loading" } });
    render(
      <TrelloBoardProvider teamId={3}>
        <Consumer />
      </TrelloBoardProvider>,
    );
    expect(useTeamBoardStateMock).toHaveBeenCalledWith(3, undefined);
    expect(screen.getByTestId("ctx")).toHaveTextContent("has");
  });

  it("passes staffView option when set", () => {
    useTeamBoardStateMock.mockReturnValue({ state: { status: "loading" } });
    render(
      <TrelloBoardProvider teamId={9} staffView>
        <Consumer />
      </TrelloBoardProvider>,
    );
    expect(useTeamBoardStateMock).toHaveBeenCalledWith(9, { staffView: true });
  });

  it("useTrelloBoard returns null outside provider", () => {
    render(<Consumer />);
    expect(screen.getByTestId("ctx")).toHaveTextContent("null");
  });
});
