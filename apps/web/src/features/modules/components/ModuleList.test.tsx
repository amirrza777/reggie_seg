import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
