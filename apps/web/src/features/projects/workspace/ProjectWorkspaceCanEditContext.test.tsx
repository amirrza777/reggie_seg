import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ProjectWorkspaceCanEditProvider,
  useProjectWorkspaceCanEdit,
} from "./ProjectWorkspaceCanEditContext";

function Probe() {
  const cap = useProjectWorkspaceCanEdit();
  return (
    <span data-testid="probe">
      {String(cap.hasTeam)}|{String(cap.workspaceArchived)}|{String(cap.canEdit)}
    </span>
  );
}

describe("ProjectWorkspaceCanEditContext", () => {
  it("uses provided capability from the provider", () => {
    render(
      <ProjectWorkspaceCanEditProvider
        value={{ hasTeam: true, workspaceArchived: true, canEdit: false }}
      >
        <Probe />
      </ProjectWorkspaceCanEditProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("true|true|false");
  });

  it("falls back to permissive defaults when no provider is mounted", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("false|false|true");
  });
});
