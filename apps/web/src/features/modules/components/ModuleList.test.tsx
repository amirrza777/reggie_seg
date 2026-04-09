import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ModuleList } from "./ModuleList";

function clickLinkWithoutNavigation(element: HTMLElement) {
  element.addEventListener("click", (event) => event.preventDefault(), { once: true });
  fireEvent.click(element);
}

describe("ModuleList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
          { id: "m4", title: "Delta", leaderCount: 0, projectCount: 0, accountRole: "STUDENT" },
        ]}
      />,
    );

    const getTitles = () =>
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

    expect(getTitles()).toEqual(["Alpha", "Beta", "Delta", "Zeta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "leaderCount" } });
    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta", "Delta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "projectCount" } });
    expect(getTitles()).toEqual(["Beta", "Zeta", "Alpha", "Delta"]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "accessLevel" } });
    expect(getTitles()).toEqual(["Alpha", "Beta", "Zeta", "Delta"]);
  });

  it("supports controlled sort mode and custom toolbar action rendering", () => {
    const onSortByChange = vi.fn();
    render(
      <ModuleList
        modules={[
          { id: "m1", title: "Zeta", leaderCount: 1 },
          { id: "m2", title: "Alpha", leaderCount: 5 },
        ]}
        sortBy="alphabetical"
        onSortByChange={onSortByChange}
        showSortControl={false}
        toolbarAction={<button type="button">Refresh modules</button>}
      />
    );

    expect(screen.queryByLabelText("Sort by")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh modules" })).toBeInTheDocument();
  });

  it("omits the toolbar when sort control and toolbar action are both disabled", () => {
    const { container } = render(
      <ModuleList
        modules={[{ id: "m1", title: "No Toolbar Module" }]}
        showSortControl={false}
      />
    );

    expect(container.querySelector(".module-list__toolbar")).not.toBeInTheDocument();
  });

  it("handles keyboard navigation and nested target keydown guards", () => {
    render(
      <ModuleList
        modules={[
          {
            id: "owner-1",
            title: "Owner Module",
            accountRole: "OWNER",
            projectWindowStart: "2026-01-15T00:00:00.000Z",
            leaderCount: 1,
            teachingAssistantCount: 0,
            projectCount: 1,
          },
        ]}
      />
    );

    const card = screen.getByRole("link", { name: "View module Owner Module" });
    fireEvent.keyDown(card, { key: "ArrowDown" });
    expect(push).not.toHaveBeenCalled();

    fireEvent.keyDown(card, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/modules/owner-1");

    const title = screen.getByRole("heading", { level: 2, name: "Owner Module" });
    fireEvent.keyDown(title, { key: "Enter" });
    expect(push).toHaveBeenCalledTimes(1);

    expect(screen.getByText(/ongoing/i)).toBeInTheDocument();
  });

  it("shows role-sensitive action menu entries and closes on outside click or escape", () => {
    render(
      <ModuleList
        modules={[
          { id: "owner-1", title: "Owner Module", accountRole: "OWNER", projectCount: 2 },
          { id: "admin-1", title: "Admin Access Module", accountRole: "ADMIN_ACCESS", projectCount: 1 },
          { id: "student-1", title: "Student Module", accountRole: "STUDENT", projectCount: 1 },
        ]}
      />
    );

    expect(screen.queryByRole("button", { name: "Module actions for Student Module" })).not.toBeInTheDocument();

    const ownerMenuTrigger = screen.getByRole("button", { name: "Module actions for Owner Module" });
    fireEvent.click(ownerMenuTrigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "View projects" })).toHaveAttribute(
      "href",
      "/staff/modules/owner-1/projects",
    );
    expect(screen.getByRole("menuitem", { name: "Manage module" })).toHaveAttribute("href", "/staff/modules/owner-1/manage");
    expect(screen.getByRole("menuitem", { name: "Create project" })).toHaveAttribute("href", "/staff/projects/create?moduleId=owner-1");

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(ownerMenuTrigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const adminMenuTrigger = screen.getByRole("button", { name: "Module actions for Admin Access Module" });
    fireEvent.click(adminMenuTrigger);
    expect(screen.getByRole("menuitem", { name: "View projects" })).toHaveAttribute(
      "href",
      "/staff/modules/admin-1/projects",
    );
    expect(screen.queryByRole("menuitem", { name: "Manage module" })).not.toBeInTheDocument();
    const createProject = screen.getByRole("menuitem", { name: "Create project" });
    expect(createProject).toHaveAttribute("href", "/staff/projects/create?moduleId=admin-1");
    clickLinkWithoutNavigation(createProject);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("formats fallback module code and avoids card navigation when project link is clicked", () => {
    render(
      <ModuleList
        modules={[
          { id: "abc-123", title: "Fallback Code Module", accountRole: "OWNER", projectCount: 3 },
        ]}
      />
    );

    expect(screen.getByText("Code: abc-123")).toBeInTheDocument();
    clickLinkWithoutNavigation(screen.getByRole("link", { name: /3 projects/i }));
    expect(push).not.toHaveBeenCalled();
  });

  it("applies default access-level rank for non-staff roles", () => {
    render(
      <ModuleList
        modules={[
          { id: "m1", title: "Unknown Role", accountRole: "STUDENT" },
          { id: "m2", title: "Owner Role", accountRole: "OWNER" },
        ]}
        sortBy="accessLevel"
      />
    );

    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles).toEqual(["Owner Role", "Unknown Role"]);
  });

  it("closes the action menu when each menu item is selected", () => {
    render(
      <ModuleList
        modules={[
          {
            id: "owner-2",
            title: "Owner Module 2",
            accountRole: "OWNER",
            projectCount: 1,
          },
        ]}
      />
    );

    const trigger = screen.getByRole("button", { name: "Module actions for Owner Module 2" });

    fireEvent.click(trigger);
    clickLinkWithoutNavigation(screen.getByRole("menuitem", { name: "View projects" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    clickLinkWithoutNavigation(screen.getByRole("menuitem", { name: "Manage module" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    clickLinkWithoutNavigation(screen.getByRole("menuitem", { name: "Create project" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
