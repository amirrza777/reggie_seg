import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffProjectsWorkspacePageHeader } from "./StaffProjectsWorkspacePageHeader";

describe("StaffProjectsWorkspacePageHeader", () => {
  it("renders fixed workspace copy and singular/plural badges", () => {
    const { rerender } = render(
      <StaffProjectsWorkspacePageHeader
        title="Project Mercury"
        teamCount={1}
        studentCount={1}
        accessRoleLabel="Module lead"
      />
    );

    expect(screen.getByText("PROJECT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Project Mercury" })).toBeInTheDocument();
    expect(screen.getByText(/Use the tabs to review project overview/i)).toBeInTheDocument();
    expect(screen.getByText("1 team")).toBeInTheDocument();
    expect(screen.getByText("1 student")).toBeInTheDocument();
    expect(screen.getByText("Your role: Module lead")).toBeInTheDocument();

    rerender(
      <StaffProjectsWorkspacePageHeader
        title="Project Mercury"
        teamCount={3}
        studentCount={8}
        accessRoleLabel="Teaching assistant"
      />
    );

    expect(screen.getByText("3 teams")).toBeInTheDocument();
    expect(screen.getByText("8 students")).toBeInTheDocument();
    expect(screen.getByText("Your role: Teaching assistant")).toBeInTheDocument();
  });
});
