import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationResults } from "./StaffCustomisedAllocationResults";

const preview = {
  project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
  questionnaireTemplateId: 101,
  previewId: "pv-1",
  generatedAt: "2026-03-23T08:00:00.000Z",
  expiresAt: "2026-03-23T08:15:00.000Z",
  teamCount: 1,
  respondentCount: 1,
  nonRespondentCount: 1,
  nonRespondentStrategy: "distribute_randomly" as const,
  criteriaSummary: [{ questionId: 1, strategy: "diversify" as const, weight: 2, satisfactionScore: 0.8 }],
  teamCriteriaSummary: [{ teamIndex: 0, criteria: [{ questionId: 1, strategy: "diversify" as const, weight: 2, responseCount: 1, summary: { kind: "categorical" as const, categories: [{ value: "Async", count: 1 }] } }] }],
  overallScore: 0.82,
  previewTeams: [{ index: 0, suggestedName: "Custom Team 1", members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com", responseStatus: "NO_RESPONSE" as const }] }],
  unassignedStudents: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com", responseStatus: "RESPONDED" as const }],
};

function renderResults(
  overrides: Partial<ComponentProps<typeof StaffCustomisedAllocationResults>> = {},
) {
  const props = {
    preview,
    confirmApply: false,
    toggleConfirmAllocation: vi.fn(),
    isPreviewCurrent: true,
    isPreviewPending: false,
    isApplyPending: false,
    unassignedStudents: preview.unassignedStudents,
    questionLabelById: new Map([[1, "Preferred style"]]),
    getTeamName: vi.fn(() => "Custom Team 1"),
    renamingTeams: {},
    onTeamNameChange: vi.fn(),
    onToggleTeamRename: vi.fn(),
    ...overrides,
  };
  render(<StaffCustomisedAllocationResults {...props} />);
  return props;
}

describe("StaffCustomisedAllocationResults", () => {
  it("renders quality and team breakdown details", () => {
    renderResults();
    expect(screen.getByText("Quality: Good (82%)")).toBeInTheDocument();
    expect(screen.getByText("Custom Team 1")).toBeInTheDocument();
    expect(screen.getByText("No questionnaire response")).toBeInTheDocument();
    expect(screen.getByText("diversify • weight 2 • 80%")).toBeInTheDocument();
    expect(screen.getByText("diversify • 2w • Async: 1")).toBeInTheDocument();
  });

  it("forwards confirm and rename actions", () => {
    const props = renderResults();
    fireEvent.click(screen.getByRole("button", { name: "Confirm allocation" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(props.toggleConfirmAllocation).toHaveBeenCalledTimes(1);
    expect(props.onToggleTeamRename).toHaveBeenCalledWith(0, "Custom Team 1", false);
  });

  it("forwards name edits when a team is in rename mode", () => {
    const props = renderResults({ renamingTeams: { 0: true } });
    fireEvent.change(screen.getByLabelText("Custom team 1 name"), { target: { value: "Team Orion" } });
    expect(props.onTeamNameChange).toHaveBeenCalledWith(0, "Team Orion");
  });
});