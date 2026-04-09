import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffProjectBreadcrumbs } from "./StaffProjectBreadcrumbs";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

describe("StaffProjectBreadcrumbs", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("renders base crumbs for project overview route", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
        moduleId="12"
        moduleName="SEGP"
      />
    );

    expect(screen.getByRole("link", { name: "Staff" })).toHaveAttribute("href", "/staff");
    expect(screen.getByRole("link", { name: "My Modules" })).toHaveAttribute("href", "/staff/modules");
    expect(screen.getByRole("link", { name: "SEGP" })).toHaveAttribute("href", "/staff/modules/12");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/staff/modules/12/projects");
    expect(screen.getByText("Alpha Project")).toHaveAttribute("aria-current", "page");
  });

  it("renders team + peer assessment student crumbs", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/teams/4/peer-assessment/77");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{ "4": "Team Delta" }}
        moduleId="12"
        moduleName="SEGP"
      />
    );

    expect(screen.getByRole("link", { name: "Team Delta" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/4"
    );
    expect(screen.getByRole("link", { name: "Peer assessment" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/4/peer-assessment"
    );
    expect(screen.getByText("Student 77")).toHaveAttribute("aria-current", "page");
  });

  it("renders team trello subsection crumbs (board, graphs, etc.)", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/teams/4/trello/graphs");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{ "4": "Team Delta" }}
        moduleId="12"
        moduleName="SEGP"
      />
    );

    expect(screen.getByRole("link", { name: "Trello" })).toHaveAttribute("href", "/staff/projects/9/trello");
    expect(screen.getByText("Graphs")).toHaveAttribute("aria-current", "page");
  });

  it("renders legacy project routes without module crumb and project-section fallback labels", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/custom-section");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
      />
    );

    expect(screen.queryByText("SEGP")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/staff/projects");
    expect(screen.getByText("Custom Section")).toHaveAttribute("aria-current", "page");
  });

  it("covers team trello/peer-feedback sections and unknown team-section fallback labels", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/teams/team%201/trello/board-view");
    const { rerender } = render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{ "team 1": "Team One" }}
      />
    );

    expect(screen.getByRole("link", { name: "Team One" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/team%201",
    );
    expect(screen.getByRole("link", { name: "Trello" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/team%201/trello",
    );
    expect(screen.getByText("Board View")).toHaveAttribute("aria-current", "page");

    usePathnameMock.mockReturnValue("/staff/projects/9/teams/8/custom-tab");
    rerender(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
      />
    );
    expect(screen.getByRole("link", { name: "Team 8" })).toHaveAttribute("href", "/staff/projects/9/teams/8");
    expect(screen.getByText("Custom Tab")).toHaveAttribute("aria-current", "page");

    usePathnameMock.mockReturnValue("/staff/projects/9/teams/8/peer-feedback/student%40example.com");
    rerender(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
      />
    );
    expect(screen.getByRole("link", { name: "Peer feedback" })).toHaveAttribute(
      "href",
      "/staff/projects/9/teams/8/peer-feedback",
    );
    expect(screen.getByText("Student student@example.com")).toHaveAttribute("aria-current", "page");
  });

  it("derives module crumbs from pathname and ignores non-matching project segments", () => {
    usePathnameMock.mockReturnValue("/staff/modules/15/projects/99/meetings");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
        moduleId={null}
        moduleName=""
      />
    );

    expect(screen.getByRole("link", { name: "Module 15" })).toHaveAttribute("href", "/staff/modules/15");
    expect(screen.queryByText("Meetings")).not.toBeInTheDocument();
    expect(screen.getByText("Alpha Project")).toHaveAttribute("aria-current", "page");
  });

  it("renders the team crumb as current when there is no team subsection", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/teams/4");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{ "4": "Team Delta" }}
      />,
    );

    expect(screen.getByText("Team Delta")).toHaveAttribute("aria-current", "page");
  });

  it("falls back to base crumbs when pathname is null or outside staff project routes", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    const { rerender } = render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
      />,
    );

    expect(screen.getByText("Alpha Project")).toHaveAttribute("aria-current", "page");

    usePathnameMock.mockReturnValue(null);
    rerender(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
      />,
    );
    expect(screen.getByText("Alpha Project")).toHaveAttribute("aria-current", "page");
  });
});
