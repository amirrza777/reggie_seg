import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { StaffTeamSectionNav } from "./StaffTeamSectionNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffTeamSectionNav", () => {
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
