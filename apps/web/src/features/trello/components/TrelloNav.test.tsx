import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrelloNav } from "./TrelloNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("TrelloNav", () => {
  it("builds section links from basePath (student-style)", () => {
    usePathnameMock.mockReturnValue("/projects/p1/trello");
    render(
      <TrelloNav
        basePath="/projects/p1/trello"
        boardName="My board"
        boardUrl="https://trello.com/b/x"
      />,
    );

    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("href", "/projects/p1/trello/board");
  });

  it("keeps project-scoped staff links when pathname is project-scoped", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/teams/4/trello");
    render(
      <TrelloNav
        basePath="/staff/projects/9/teams/4/trello"
        boardName="Board"
        boardUrl="https://trello.com/b/x"
      />,
    );

    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("href", "/staff/projects/9/teams/4/trello/board");
  });

  it("uses the same basePath when current route is module-scoped (caller normalizes via resolveStaffTeamBasePath)", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/teams/4/trello");
    render(
      <TrelloNav
        basePath="/staff/projects/9/teams/4/trello"
        boardName="Board"
        boardUrl="https://trello.com/b/x"
      />,
    );

    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/4/trello/board",
    );
  });

  it("strips a trailing slash from basePath for links", () => {
    usePathnameMock.mockReturnValue("/projects/p1/trello");
    render(
      <TrelloNav basePath="/projects/p1/trello/" boardName="B" boardUrl={null} />,
    );
    expect(screen.getByRole("link", { name: "Summary" })).toHaveAttribute("href", "/projects/p1/trello");
  });

  it("treats pathname '/' as summary when basePath is '/'", () => {
    usePathnameMock.mockReturnValue("/");
    render(<TrelloNav basePath="/" boardName="B" boardUrl={null} />);
    expect(screen.getByRole("link", { name: "Summary" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Summary" })).toHaveClass("pill-nav__link--active");
  });
});
