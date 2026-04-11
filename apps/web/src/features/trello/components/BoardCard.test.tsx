import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoardCard } from "./BoardCard";
import type { TrelloCard, TrelloMember } from "../types";

describe("BoardCard", () => {
  const baseCard: TrelloCard = {
    id: "c1",
    name: "Task",
    idList: "l1",
  };

  it("renders title without optional description, labels, due, activity, or members", () => {
    render(<BoardCard card={baseCard} members={[]} />);
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
  });

  it("renders description, labels (fallback name), due, last activity, and member initials", () => {
    const card: TrelloCard = {
      ...baseCard,
      desc: "Details here",
      labels: [{ id: "lb", name: "" }],
      due: "2024-03-15",
      dateLastActivity: "2024-03-10",
    };
    const members: TrelloMember[] = [{ id: "m1", fullName: "Alex Example", initials: "AE" }];
    render(<BoardCard card={card} members={members} />);
    expect(screen.getByText("Details here")).toBeInTheDocument();
    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText(/Due/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText("AE")).toBeInTheDocument();
  });

  it("uses first two letters of fullName when initials missing", () => {
    const members: TrelloMember[] = [{ id: "m1", fullName: "Bo" }];
    render(<BoardCard card={baseCard} members={members} />);
    expect(screen.getByText("Bo")).toBeInTheDocument();
  });

  it("renders multiple label chips with explicit names", () => {
    const card: TrelloCard = {
      ...baseCard,
      labels: [
        { id: "l1", name: "Bug" },
        { id: "l2", name: "Docs" },
      ],
    };
    render(<BoardCard card={card} members={[]} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
  });
});
