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

  it("renders project trello child crumb with title-cased child label", () => {
    usePathnameMock.mockReturnValue("/staff/modules/12/projects/9/trello/graphs");
    render(
      <StaffProjectBreadcrumbs
        projectId="9"
        projectName="Alpha Project"
        teamNamesById={{}}
        moduleId="12"
        moduleName="SEGP"
      />
    );

    expect(screen.getByRole("link", { name: "Trello" })).toHaveAttribute("href", "/staff/projects/9/trello");
    expect(screen.getByText("Graphs")).toHaveAttribute("aria-current", "page");
  });
});
