import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanelStep3 } from "./StaffCustomisedAllocationPanel.step3";

const previewMember = { id: 11, firstName: "Jin", lastName: "Lee", email: "jin@example.com", responseStatus: "RESPONDED" };
const previewTeam = { index: 0, suggestedName: "Team 1", members: [previewMember] };

function renderStep3(overrides: Record<string, unknown> = {}) {
  const props = {
    teamCountInput: "2",
    onTeamCountInputChange: vi.fn(),
    minTeamSizeInput: "",
    onMinTeamSizeInputChange: vi.fn(),
    maxTeamSizeInput: "",
    onMaxTeamSizeInputChange: vi.fn(),
    canPreparePreview: true,
    isLoadingCoverage: false,
    runPreview: vi.fn(),
    runApplyAllocation: vi.fn(),
    isPreviewCurrent: false,
    confirmApply: false,
    isPreviewPending: false,
    isApplyPending: false,
    errorMessage: "",
    successMessage: "",
    preview: null,
    unassignedStudents: [],
    teamNames: {},
    renamingTeams: {},
    questionLabelById: new Map<number, string>(),
    getTeamName: (_index: number, fallback: string) => fallback,
    toggleConfirmAllocation: vi.fn(),
    onTeamNameChange: vi.fn(),
    onToggleTeamRename: vi.fn(),
    ...overrides,
  };
  render(<StaffCustomisedAllocationPanelStep3 {...(props as never)} />);
  return props;
}

describe("StaffCustomisedAllocationPanelStep3", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders team count and team size inputs", () => {
    renderStep3();
    expect(screen.getByLabelText("Customised team count")).toBeInTheDocument();
    expect(screen.getByLabelText("Customised minimum students per team")).toBeInTheDocument();
    expect(screen.getByLabelText("Customised maximum students per team")).toBeInTheDocument();
  });

  it("calls input change handlers", () => {
    const props = renderStep3();
    fireEvent.change(screen.getByLabelText("Customised team count"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Customised minimum students per team"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Customised maximum students per team"), { target: { value: "5" } });
    expect(props.onTeamCountInputChange).toHaveBeenCalledWith("4");
    expect(props.onMinTeamSizeInputChange).toHaveBeenCalledWith("2");
    expect(props.onMaxTeamSizeInputChange).toHaveBeenCalledWith("5");
  });

  it("calls runPreview when the preview button is clicked", () => {
    const props = renderStep3();
    fireEvent.click(screen.getByRole("button", { name: /preview customised teams/i }));
    expect(props.runPreview).toHaveBeenCalled();
  });

  it("disables preview button when canPreparePreview is false", () => {
    renderStep3({ canPreparePreview: false });
    expect(screen.getByRole("button", { name: /preview customised teams/i })).toBeDisabled();
  });

  it("shows an error message when errorMessage is set", () => {
    renderStep3({ errorMessage: "Something went wrong" });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows a success message when successMessage is set", () => {
    renderStep3({ successMessage: "Draft saved!" });
    expect(screen.getByText("Draft saved!")).toBeInTheDocument();
  });

  it("disables all inputs and buttons when confirmApply is true", () => {
    const preview = {
      previewId: "pv-1",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.9,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [],
      unassignedStudents: [],
    };
    renderStep3({ confirmApply: true, preview, isPreviewCurrent: true });
    expect(screen.getByLabelText("Customised team count")).toBeDisabled();
    expect(screen.getByRole("button", { name: /preview customised teams/i })).toBeDisabled();
  });

  it("shows preview results with team name, members and quality label", () => {
    const preview = {
      previewId: "pv-1",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.85,
      criteriaSummary: [{ questionId: 1, strategy: "diversify", weight: 1, satisfactionScore: 0.85 }],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [],
      unassignedStudents: [],
    };
    const questionLabelById = new Map([[1, "Work style"]]);
    renderStep3({ preview, isPreviewCurrent: true, questionLabelById });
    expect(screen.getByText("Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Lee")).toBeInTheDocument();
    expect(screen.getByText(/Quality: Good/i)).toBeInTheDocument();
    expect(screen.getByText(/Work style/i)).toBeInTheDocument();
  });

  it("shows team criteria breakdown when teamCriteriaSummary is populated", () => {
    const preview = {
      previewId: "pv-1",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.7,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [
        {
          teamIndex: 0,
          criteria: [{ questionId: 1, strategy: "diversify", weight: 1, responseCount: 1,
            summary: { kind: "categorical", categories: [{ value: "Remote", count: 1 }] } }],
        },
      ],
      unassignedStudents: [],
    };
    const questionLabelById = new Map([[1, "Work style"]]);
    renderStep3({ preview, isPreviewCurrent: true, questionLabelById });
    expect(screen.getByText("Criteria breakdown")).toBeInTheDocument();
    expect(screen.getByText("Work style")).toBeInTheDocument();
  });

  it("renders fallback labels and singular unassigned text", () => {
    const preview = {
      previewId: "pv-2",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.88,
      criteriaSummary: [{ questionId: 42, strategy: "balance", weight: 2, satisfactionScore: 0.75 }],
      previewTeams: [{
        index: 0,
        suggestedName: "Team A",
        members: [{ id: 22, firstName: "Sam", lastName: "Kai", email: "sam@example.com", responseStatus: "NO_RESPONSE" }],
      }],
      teamCriteriaSummary: [
        {
          teamIndex: 0,
          criteria: [{
            questionId: 7,
            strategy: "balance",
            weight: 2,
            responseCount: 1,
            summary: { kind: "categorical", categories: [{ value: "Morning", count: 1 }] },
          }],
        },
      ],
      unassignedStudents: [
        { id: 99, firstName: "Una", lastName: "Signed", email: "una@example.com", responseStatus: "RESPONDED" },
      ],
    };

    renderStep3({
      preview,
      isPreviewCurrent: true,
      questionLabelById: new Map<number, string>(),
      unassignedStudents: preview.unassignedStudents,
    });

    expect(screen.getByText(/1 student could not be assigned/i)).toBeInTheDocument();
    expect(screen.getByText("Question 42")).toBeInTheDocument();
    expect(screen.getByText("Question 7")).toBeInTheDocument();
    expect(screen.getByText("Responded")).toBeInTheDocument();
    expect(screen.getAllByText(/No questionnaire response/i).length).toBeGreaterThan(0);
  });

  it("handles previews without teamCriteriaSummary", () => {
    const preview = {
      previewId: "pv-3",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.8,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      unassignedStudents: [],
    };

    renderStep3({ preview, isPreviewCurrent: true });
    expect(screen.queryByText("Criteria breakdown")).not.toBeInTheDocument();
  });

  it("calls onToggleTeamRename when Rename button is clicked", () => {
    const preview = {
      previewId: "pv-1",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.8,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [],
      unassignedStudents: [],
    };
    const props = renderStep3({ preview, isPreviewCurrent: true });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(props.onToggleTeamRename).toHaveBeenCalledWith(0, "Team 1", false);
  });

  it("shows rename input and calls onTeamNameChange when renamingTeams is set", () => {
    const preview = {
      previewId: "pv-1",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.8,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [],
      unassignedStudents: [],
    };
    const props = renderStep3({ preview, isPreviewCurrent: true, renamingTeams: { 0: true } });
    const input = screen.getByLabelText("Custom team 1 name");
    fireEvent.change(input, { target: { value: "Orion" } });
    expect(props.onTeamNameChange).toHaveBeenCalledWith(0, "Orion");
  });

  it("calls toggleConfirmAllocation when confirm button is clicked", () => {
    const preview = {
      previewId: "pv-1",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.8,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [],
      unassignedStudents: [],
    };
    const props = renderStep3({ preview, isPreviewCurrent: true });
    fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
    expect(props.toggleConfirmAllocation).toHaveBeenCalled();
  });

  it("calls runApplyAllocation when apply button is enabled", () => {
    const preview = {
      previewId: "pv-4",
      respondentCount: 1,
      nonRespondentCount: 0,
      teamCount: 1,
      overallScore: 0.8,
      criteriaSummary: [],
      previewTeams: [previewTeam],
      teamCriteriaSummary: [],
      unassignedStudents: [],
    };
    const props = renderStep3({ preview, isPreviewCurrent: true, confirmApply: true });
    fireEvent.click(screen.getByRole("button", { name: /Save draft allocation/i }));
    expect(props.runApplyAllocation).toHaveBeenCalled();
  });
});
