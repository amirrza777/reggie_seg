import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrelloJoinBoardView } from "./TrelloJoinBoardView";

describe("TrelloJoinBoardView", () => {
  it("renders actions and triggers retry callback", () => {
    const onRetry = vi.fn();

    render(<TrelloJoinBoardView boardUrl="https://trello.com/b/board-1" onRetry={onRetry} />);

    const openBoard = screen.getByRole("link", { name: "Open board in Trello" });
    expect(openBoard).toHaveAttribute("href", "https://trello.com/b/board-1");
    expect(openBoard).toHaveAttribute("target", "_blank");
    expect(openBoard).toHaveAttribute("rel", "noreferrer");

    fireEvent.click(screen.getByRole("button", { name: "I've joined - show board" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
