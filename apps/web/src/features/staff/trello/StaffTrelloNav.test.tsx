import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffTrelloNav } from "./StaffTrelloNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffTrelloNav", () => {
  it("keeps staff/projects links when moduleId is provided on project routes", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/teams/4/trello");
    render(<StaffTrelloNav projectId="9" teamId="4" boardName="Board" moduleId={12} />);

    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("href", "/staff/projects/9/teams/4/trello/board");
  });

  it("normalizes module-scoped links when current route is module-scoped", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/teams/4/trello");
    render(<StaffTrelloNav projectId="9" teamId="4" boardName="Board" moduleId={12} />);

    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/4/trello/board",
    );
  });
});
