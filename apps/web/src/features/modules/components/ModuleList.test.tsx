import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { ModuleList } from "./ModuleList";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("ModuleList", () => {
  beforeEach(() => {
    push.mockReset();
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

  it("shows management actions for module owners", () => {
    render(
      <ModuleList
        modules={[
          { id: "12", title: "Software Engineering", accountRole: "OWNER" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Module actions for Software Engineering" }));

    expect(screen.getByRole("menuitem", { name: "Manage module" })).toHaveAttribute(
      "href",
      "/staff/modules/12/manage",
    );
    expect(screen.getByRole("menuitem", { name: "Create project" })).toHaveAttribute(
      "href",
      "/staff/projects/create?moduleId=12",
    );
  });

  it("hides manage-module action for admin access role", () => {
    render(
      <ModuleList
        modules={[
          { id: "22", title: "Data Structures", accountRole: "ADMIN_ACCESS" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Module actions for Data Structures" }));

    expect(screen.queryByRole("menuitem", { name: "Manage module" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Create project" })).toHaveAttribute(
      "href",
      "/staff/projects/create?moduleId=22",
    );
  });

  it("opens the module when the card is clicked", () => {
    render(
      <ModuleList
        modules={[
          { id: "31", title: "Machine Learning", accountRole: "OWNER" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "View module Machine Learning" }));
    expect(push).toHaveBeenCalledWith("/modules/31");
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
