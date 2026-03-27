import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffModulesPageClient } from "./StaffModulesPageClient";

const moduleListCalls: Array<Record<string, unknown>> = [];

vi.mock("./ModuleList", () => ({
  ModuleList: (props: Record<string, unknown>) => {
    moduleListCalls.push(props);
    return (
      <div
        data-testid="module-list"
        data-sort-by={String(props.sortBy)}
        data-show-sort={String(props.showSortControl)}
      />
    );
  },
}));

const modules = [
  { id: 1, code: "7CCS01", title: "Software Engineering", teamCount: 4, projectCount: 2, accessLevel: "Staff" },
  { id: 2, code: "7CCS02", title: "Distributed Systems", teamCount: 3, projectCount: 1, accessLevel: "Staff" },
] as unknown as Parameters<typeof StaffModulesPageClient>[0]["modules"];

describe("StaffModulesPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moduleListCalls.length = 0;
  });

  it("shows an error and hides sort controls when an error message exists", () => {
    render(
      <StaffModulesPageClient
        modules={modules}
        subtitle="Assigned modules"
        errorMessage="Unable to load modules."
      />
    );

    expect(screen.getByText("Unable to load modules.")).toBeInTheDocument();
    expect(screen.queryByTestId("module-list")).not.toBeInTheDocument();
  });

  it("passes sort control props for non-empty modules", () => {
    render(
      <StaffModulesPageClient
        modules={modules}
        subtitle="Assigned modules"
        errorMessage={null}
      />
    );

    const list = screen.getByTestId("module-list");

    expect(list).toHaveAttribute("data-sort-by", "alphabetical");
    expect(list).toHaveAttribute("data-show-sort", "true");
    expect(moduleListCalls.at(-1)?.moduleHrefBasePath).toBe("/staff/modules");
  });

  it("hides sort controls when modules are empty", () => {
    render(
      <StaffModulesPageClient
        modules={[]}
        subtitle="Assigned modules"
        errorMessage={null}
      />
    );

    expect(screen.getByTestId("module-list")).toBeInTheDocument();
    expect(moduleListCalls.at(-1)?.modules).toEqual([]);
    expect(moduleListCalls.at(-1)?.showSortControl).toBe(false);
  });
});
