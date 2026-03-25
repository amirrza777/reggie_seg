import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ModuleList } from "./ModuleList";

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

  it("prefers the stored module code over the numeric fallback", () => {
    render(<ModuleList modules={[{ id: "12", code: "4CCS2DBS", title: "Databases" }]} />);
    expect(screen.getByText("Code: 4CCS2DBS")).toBeInTheDocument();
  });

  it("shows module leads, teaching assistants, projects, and project-derived date range", () => {
    render(
      <ModuleList
        modules={[
          {
            id: "m1",
            title: "Algorithms",
            leaderCount: 2,
            teachingAssistantCount: 1,
            projectCount: 3,
            projectWindowStart: "2025-01-01T00:00:00.000Z",
            projectWindowEnd: "2025-06-30T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText(/2 module leads/i)).toBeInTheDocument();
    expect(screen.getByText(/1 teaching assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/3 projects/i)).toBeInTheDocument();
    const card = screen.getByRole("link", { name: "View module Algorithms" });
    expect(card.querySelector(".module-card__dates")?.textContent).toMatch(/2025/);
  });

  it("opens staff module routes when a staff base path is provided", () => {
    render(
      <ModuleList
        modules={[
          { id: "31", title: "Machine Learning", accountRole: "OWNER" },
        ]}
        moduleHrefBasePath="/staff/modules"
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "View module Machine Learning" }));
    expect(push).toHaveBeenCalledWith("/staff/modules/31");
  });

  it("sorts modules by the selected mode", () => {
    render(
      <ModuleList
        modules={[
          { id: "m1", title: "Zeta", leaderCount: 1, projectCount: 2, accountRole: "TEACHING_ASSISTANT" },
          { id: "m2", title: "Alpha", leaderCount: 5, projectCount: 1, accountRole: "OWNER" },
          { id: "m3", title: "Beta", leaderCount: 3, projectCount: 8, accountRole: "ADMIN_ACCESS" },
        ]}
      />,
    );

    const getTitles = () =>
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "leaderCount" } });
    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "projectCount" } });
    expect(getTitles()).toEqual(["Beta", "Zeta", "Alpha"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "accessLevel" } });
    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta"]);
  });
});
