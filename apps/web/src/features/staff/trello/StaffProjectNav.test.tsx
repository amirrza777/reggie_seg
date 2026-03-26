import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffProjectNav } from "./StaffProjectNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffProjectNav", () => {
  it("marks overview as active on the project overview route", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9");

    render(<StaffProjectNav projectId="9" />);

    const overviewLink = screen.getByRole("link", { name: "Overview" });
    const trelloLink = screen.getByRole("link", { name: "Trello" });

    expect(overviewLink.className).toContain("pill-nav__link--active");
    expect(overviewLink).toHaveAttribute("aria-current", "page");
    expect(trelloLink.className).not.toContain("pill-nav__link--active");
  });

  it("normalizes module-scoped links and marks trello as active in module routes", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/trello/board");

    render(<StaffProjectNav projectId="9" />);

    const overviewLink = screen.getByRole("link", { name: "Overview" });
    const trelloLink = screen.getByRole("link", { name: "Trello" });

    expect(overviewLink).toHaveAttribute("href", "/staff/projects/9");
    expect(trelloLink).toHaveAttribute("href", "/staff/projects/9/trello");
    expect(trelloLink.className).toContain("pill-nav__link--active");
    expect(trelloLink).toHaveAttribute("aria-current", "page");
  });
});
