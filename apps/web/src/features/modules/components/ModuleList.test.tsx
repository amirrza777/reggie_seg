import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModuleList } from "./ModuleList";
import React from "react";

describe("ModuleList", () => {
  it("renders an empty state by default", () => {
    render(<ModuleList />);
    expect(screen.getByText("No modules assigned yet.")).toBeInTheDocument();
  });

  it("renders provided modules and empty fallback descriptions", () => {
    render(
      <ModuleList
        modules={[
          { id: "m1", title: "Algorithms", description: "Graph theory" },
          { id: "m2", title: "Databases" },
        ]}
      />,
    );

    expect(screen.getByText("Algorithms")).toBeInTheDocument();
    expect(screen.getByText("Graph theory")).toBeInTheDocument();
    expect(screen.getByText("Databases")).toBeInTheDocument();
  });

  it("makes the whole card a link to that module's staff overview", () => {
    render(
      <ModuleList
        modules={[
          { id: "12", title: "Software Engineering", accountRole: "OWNER" },
        ]}
      />,
    );

    const cardLink = screen.getByRole("link", { name: /Software Engineering: open module overview/i });
    expect(cardLink).toHaveAttribute("href", "/staff/modules/12");
    expect(screen.queryByRole("link", { name: "Manage module" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create project" })).not.toBeInTheDocument();
  });

  it("uses the same card link pattern for admin access role", () => {
    render(
      <ModuleList
        modules={[
          { id: "22", title: "Data Structures", accountRole: "ADMIN_ACCESS" },
        ]}
      />,
    );

    expect(screen.queryByRole("link", { name: "Manage module" })).not.toBeInTheDocument();
    const cardLink = screen.getByRole("link", { name: /Data Structures: open module overview/i });
    expect(cardLink).toHaveAttribute("href", "/staff/modules/22");
  });

  it("sorts modules by the selected mode", () => {
    render(
      <ModuleList
        modules={[
          { id: "m1", title: "Zeta", teamCount: 1, projectCount: 2, accountRole: "TEACHING_ASSISTANT" },
          { id: "m2", title: "Alpha", teamCount: 5, projectCount: 1, accountRole: "OWNER" },
          { id: "m3", title: "Beta", teamCount: 3, projectCount: 8, accountRole: "ADMIN_ACCESS" },
        ]}
      />,
    );

    const getTitles = () =>
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "teamCount" } });
    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "projectCount" } });
    expect(getTitles()).toEqual(["Beta", "Zeta", "Alpha"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "accessLevel" } });
    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta"]);
  });
});
