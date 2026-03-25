import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { StaffTeamSectionNav } from "./StaffTeamSectionNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffTeamSectionNav", () => {
  it("renders health tab label for team route", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    const healthLink = screen.getByRole("link", { name: "Health" });
    expect(healthLink).toHaveAttribute("href", "/staff/projects/2/teams/3/team");
  });

  it("renders grading as the final tab", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    const links = screen.getAllByRole("link");
    expect(links.at(-1)).toHaveTextContent("Grading");
  });

  it("renders grading tab link", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    expect(screen.getByRole("link", { name: "Grading" })).toBeInTheDocument();
  });

  it("marks grading tab active on grading route", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3/grading");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    const gradingLink = screen.getByRole("link", { name: "Grading" });
    expect(gradingLink.className).toContain("pill-nav__link--active");
    expect(gradingLink).toHaveAttribute("aria-current", "page");
  });
});
