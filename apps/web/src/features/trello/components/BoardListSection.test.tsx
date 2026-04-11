import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoardListSection } from "./BoardListSection";
import type { TrelloCard, TrelloList } from "../types";

describe("BoardListSection", () => {
  const list: TrelloList = { id: "l1", name: "Backlog" };

  it("shows status label from SECTION_STATUS_LABELS and raw key fallback", () => {
    const { rerender, container } = render(
      <BoardListSection list={list} cards={[]} sectionStatus="backlog" />,
    );
    const eyebrow = container.querySelector(".eyebrow");
    expect(eyebrow).toHaveTextContent("Backlog");

    rerender(<BoardListSection list={list} cards={[]} sectionStatus="custom_unknown" />);
    expect(container.querySelector(".eyebrow")).toHaveTextContent("custom_unknown");
  });

  it("omits mapped status line when sectionStatus is absent", () => {
    const { container } = render(<BoardListSection list={list} cards={[]} />);
    expect(container.querySelector(".eyebrow")).toBeNull();
  });

  it("lists cards and shows empty state when no cards", () => {
    const cards: TrelloCard[] = [{ id: "c1", name: "One", idList: "l1" }];
    const { rerender } = render(<BoardListSection list={list} cards={cards} />);
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.queryByText("No cards")).not.toBeInTheDocument();

    rerender(<BoardListSection list={list} cards={[]} />);
    expect(screen.getByText("No cards")).toBeInTheDocument();
  });
});
