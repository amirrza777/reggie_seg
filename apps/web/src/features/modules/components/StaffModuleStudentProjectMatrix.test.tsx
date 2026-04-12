import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ModuleStudentProjectMatrixProject, ModuleStudentProjectMatrixStudent } from "./types";
import { StaffModuleStudentProjectMatrix } from "./StaffModuleStudentProjectMatrix";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const projects: ModuleStudentProjectMatrixProject[] = [
  { id: 10, name: "Project Alpha" },
  { id: 11, name: "Project Beta" },
];

const students: ModuleStudentProjectMatrixStudent[] = [
  {
    userId: 1,
    email: "ada@example.com",
    displayName: "Ada Lovelace",
    teamCells: [{ teamId: 90, teamName: "Team A" }, null],
  },
  {
    userId: 2,
    email: "alan@example.com",
    displayName: "Alan Turing",
    teamCells: [null, { teamId: 91, teamName: "Team B" }],
  },
];

describe("StaffModuleStudentProjectMatrix", () => {
  it("renders table, project header links, and team links with encoded module param", () => {
    render(<StaffModuleStudentProjectMatrix moduleRouteParam="7" projects={projects} students={students} />);
    expect(screen.getByRole("link", { name: /Project Alpha/ })).toHaveAttribute("href", "/staff/modules/7/projects/10");
    expect(screen.getByRole("link", { name: /Team A/ })).toHaveAttribute(
      "href",
      "/staff/modules/7/projects/10/teams/90",
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("2 students")).toBeInTheDocument();
  });

  it("filters rows by search query and shows empty state when nothing matches", () => {
    render(<StaffModuleStudentProjectMatrix moduleRouteParam="7" projects={projects} students={students} />);
    fireEvent.change(screen.getByLabelText("Search students and team names in the matrix"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No students match this search.")).toBeInTheDocument();
    expect(screen.getByText(/Showing 0 of 2 students/)).toBeInTheDocument();
  });

  it("matches team name in search blob", () => {
    render(<StaffModuleStudentProjectMatrix moduleRouteParam="7" projects={projects} students={students} />);
    fireEvent.change(screen.getByLabelText("Search students and team names in the matrix"), {
      target: { value: "Team B" },
    });
    expect(screen.getByText(/Showing 1 of 2 students/)).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
  });
});
