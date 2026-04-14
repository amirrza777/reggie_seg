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

    const healthLink = screen.getByRole("link", { name: "Team Health" });
    expect(healthLink).toHaveAttribute("href", "/staff/projects/2/teams/3/teamhealth");
  });

  it("renders marking tab", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    expect(screen.getByRole("link", { name: "Marking" })).toBeInTheDocument();
  });

  it("renders marking tab link", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    expect(screen.getByRole("link", { name: "Marking" })).toBeInTheDocument();
  });

  it("marks marking tab active on grading route", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3/grading");
    render(<StaffTeamSectionNav projectId="2" teamId="3" />);

    const markingLink = screen.getByRole("link", { name: "Marking" });
    expect(markingLink.className).toContain("pill-nav__link--active");
    expect(markingLink).toHaveAttribute("aria-current", "page");
  });

  it("keeps staff/projects route links when moduleId is provided", () => {
    usePathnameMock.mockReturnValue("/staff/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" moduleId={12} />);

    expect(screen.getByRole("link", { name: "Team Health" })).toHaveAttribute("href", "/staff/projects/2/teams/3/teamhealth");
  });

  it("normalizes module-scoped routes to canonical staff/projects links", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/2/teams/3");
    render(<StaffTeamSectionNav projectId="2" teamId="3" moduleId={12} />);

    expect(screen.getByRole("link", { name: "Team Health" })).toHaveAttribute(
      "href",
      "/staff/projects/2/teams/3/teamhealth",
    );
  });
});
