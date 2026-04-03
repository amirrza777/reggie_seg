import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarkingStudentList } from "./MarkingStudentList";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("MarkingStudentList", () => {
  it("renders student links and unavailable-id fallback", () => {
    render(
      <MarkingStudentList
        moduleId={4}
        projectId={9}
        teamId={21}
        students={[
          { id: 11, title: "Alice Roe" },
          { id: null, title: "Unknown Student" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Open student marking" })).toHaveAttribute(
      "href",
      "/staff/modules/4/projects/9/teams/21/peer-assessment/11",
    );
    expect(screen.getByText("Student identifier unavailable.")).toBeInTheDocument();
  });

  it("filters students by query and clears the query", async () => {
    const user = userEvent.setup();

    render(
      <MarkingStudentList
        moduleId={4}
        projectId={9}
        teamId={21}
        students={[
          { id: 11, title: "Alice Roe" },
          { id: 12, title: "Bob Yeo" },
        ]}
      />,
    );

    const searchInput = screen.getByRole("searchbox", { name: "Search students" });
    await user.type(searchInput, "bob");

    expect(screen.queryByText("Alice Roe")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Yeo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("Alice Roe")).toBeInTheDocument();
    expect((searchInput as HTMLInputElement).value).toBe("");
  });

  it("shows empty-filter state when no student matches", async () => {
    const user = userEvent.setup();

    render(
      <MarkingStudentList
        moduleId={4}
        projectId={9}
        teamId={21}
        students={[{ id: 11, title: "Alice Roe" }]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Search students" }), "charlie");
    expect(screen.getByText("No students match “charlie”.")).toBeInTheDocument();
  });
});
