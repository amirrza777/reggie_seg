import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffProjectSectionNav } from "./StaffProjectSectionNav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffProjectSectionNav", () => {
  it("renders Team allocation and Discussion Forum links", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9");
    render(<StaffProjectSectionNav projectId="9" />);

    expect(screen.getByRole("link", { name: "Team allocation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discussion Forum" })).toBeInTheDocument();
  });

  it("marks Discussion Forum as active on nested discussion routes", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/discussion/123");
    render(<StaffProjectSectionNav projectId="9" />);

    const forumLink = screen.getByRole("link", { name: "Discussion Forum" });
    expect(forumLink.className).toContain("pill-nav__link--active");
    expect(forumLink).toHaveAttribute("aria-current", "page");
  });
});
