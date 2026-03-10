import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { StaffTeamSectionNav } from "./StaffTeamSectionNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffTeamSectionNav", () => {
  it("renders repositories tab link", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    expect(screen.getByRole("link", { name: "Repositories" })).toBeInTheDocument();
  });

  it("marks repositories tab active on repositories route", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3/repositories");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    const repositoriesLink = screen.getByRole("link", { name: "Repositories" });
    expect(repositoriesLink.className).toContain("pill-nav__link--active");
    expect(repositoriesLink).toHaveAttribute("aria-current", "page");
  });
});
