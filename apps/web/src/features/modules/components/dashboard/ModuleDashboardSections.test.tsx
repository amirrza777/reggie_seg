import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModuleMarksSection } from "./ModuleDashboardSections";

describe("ModuleMarksSection", () => {
  it("renders placeholder when marks are empty", () => {
    render(<ModuleMarksSection marksRows={[]} />);

    expect(screen.getByText("No marks available")).toBeInTheDocument();
    expect(screen.getByText(/Marks will appear here/i)).toBeInTheDocument();
  });

  it("renders marks rows in a table", () => {
    render(
      <ModuleMarksSection
        marksRows={[
          ["Team Alpha", "Peer assessment", "Complete"],
          ["Team Beta", "Presentation", "Pending"],
        ]}
      />,
    );

    const region = screen.getByRole("region", { name: "Module marks" });
    expect(within(region).getByText("Team")).toBeInTheDocument();
    expect(within(region).getByText("Assessment")).toBeInTheDocument();
    expect(within(region).getByText("Status")).toBeInTheDocument();
    expect(within(region).getByText("Team Alpha")).toBeInTheDocument();
    expect(within(region).getByText("Presentation")).toBeInTheDocument();
    expect(within(region).getByText("Pending")).toBeInTheDocument();
  });
});
