import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffProjectSectionNav } from "./StaffProjectSectionNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffProjectSectionNav", () => {
  it("renders Team Allocation, Meetings, Discussion Forum, and Peer Assessments links", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9");
    render(<StaffProjectSectionNav projectId="9" />);

    expect(screen.getByRole("link", { name: "Team Allocation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meetings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discussion Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Peer Assessments" })).toHaveAttribute(
      "href",
      "/staff/projects/9/peer-assessments",
    );
  });

  it("marks Discussion Forum as active on nested discussion routes", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/discussion/123");
    render(<StaffProjectSectionNav projectId="9" />);

    const forumLink = screen.getByRole("link", { name: "Discussion Forum" });
    expect(forumLink.className).toContain("pill-nav__link--active");
    expect(forumLink).toHaveAttribute("aria-current", "page");
  });

  it("keeps staff/projects links when moduleId is provided on project routes", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9");
    render(<StaffProjectSectionNav projectId="9" moduleId={12} />);

    expect(screen.getByRole("link", { name: "Team Allocation" })).toHaveAttribute(
      "href",
      "/staff/projects/9/team-allocation",
    );
  });

  it("normalizes module-scoped routes to canonical staff/projects links", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/discussion");
    render(<StaffProjectSectionNav projectId="9" moduleId={12} />);

    expect(screen.getByRole("link", { name: "Discussion Forum" })).toHaveAttribute(
      "href",
      "/staff/projects/9/discussion",
    );
  });
});
