import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffModuleAccessChangesReview } from "./StaffModuleAccessChangesReview";

describe("StaffModuleAccessChangesReview", () => {
  it("renders muted copy when there are no changes", () => {
    render(
      <StaffModuleAccessChangesReview
        hasChanges={false}
        leaderDiff={{ added: [], removed: [] }}
        taDiff={{ added: [], removed: [] }}
        labelFor={(id) => `User ${id}`}
      />,
    );
    expect(screen.getByText("No changes to save.")).toBeInTheDocument();
  });

  it("lists added and removed leads and teaching assistants", () => {
    render(
      <StaffModuleAccessChangesReview
        hasChanges
        leaderDiff={{ added: [10], removed: [20] }}
        taDiff={{ added: [30], removed: [40] }}
        labelFor={(id) => `Label ${id}`}
      />,
    );
    expect(screen.getByText("Module leads — add (1)")).toBeInTheDocument();
    expect(screen.getByText("Label 10")).toBeInTheDocument();
    expect(screen.getByText("Module leads — remove (1)")).toBeInTheDocument();
    expect(screen.getByText("Label 20")).toBeInTheDocument();
    expect(screen.getByText("Teaching assistants — add (1)")).toBeInTheDocument();
    expect(screen.getByText("Label 30")).toBeInTheDocument();
    expect(screen.getByText("Teaching assistants — remove (1)")).toBeInTheDocument();
    expect(screen.getByText("Label 40")).toBeInTheDocument();
  });
});
