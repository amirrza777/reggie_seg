import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanelStep1 } from "./StaffCustomisedAllocationPanel.step1";
import { StaffCustomisedAllocationPanelStep3 } from "./StaffCustomisedAllocationPanel.step3";

const questionnaire = {
  id: 101,
  templateName: "Team Setup",
  ownerId: 1,
  isPublic: true,
  eligibleQuestionCount: 1,
  eligibleQuestions: [{ id: 1, label: "Work style", type: "multiple-choice" }],
};

function renderStep1(overrides: Record<string, unknown> = {}) {
  const props = {
    isLoadingQuestionnaires: false,
    loadError: "",
    eligibleQuestionnaires: [questionnaire],
    visibleQuestionnaires: [questionnaire],
    questionnaireSearch: "",
    onQuestionnaireSearchChange: vi.fn(),
    selectedTemplateId: "101",
    onSelectTemplate: vi.fn(),
    selectedQuestionnaire: questionnaire,
    activeCriteriaCount: 1,
    coverage: null,
    isLoadingCoverage: false,
    coverageError: "",
    hasLowCoverage: false,
    nonRespondentStrategy: "distribute_randomly",
    onNonRespondentStrategyChange: vi.fn(),
    confirmApply: false,
    isPreviewPending: false,
    isApplyPending: false,
    ...overrides,
  };
  render(<StaffCustomisedAllocationPanelStep1 {...(props as never)} />);
  return props;
}

function renderStep3(overrides: Record<string, unknown> = {}) {
  const preview = {
    previewId: "pv-1",
    respondentCount: 1,
    nonRespondentCount: 1,
    teamCount: 2,
    overallScore: 0.72,
    criteriaSummary: [],
    previewTeams: [
      { index: 0, suggestedName: "Team 1", members: [{ id: 11, firstName: "Jin", lastName: "Lee", email: "jin@example.com", responseStatus: "RESPONDED" }] },
      { index: 1, suggestedName: "Team 2", members: [{ id: 12, firstName: "", lastName: "", email: "sunil@example.com", responseStatus: "NO_RESPONSE" }] },
    ],
    teamCriteriaSummary: [],
  };
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
    preview,
    unassignedStudents: [
      { id: 21, firstName: "No", lastName: "Response", email: "nr@example.com", responseStatus: "NO_RESPONSE" },
      { id: 22, firstName: "Has", lastName: "Response", email: "hr@example.com", responseStatus: "RESPONDED" },
    ],
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

describe("StaffCustomisedAllocationPanel steps", () => {
  it("shows no-eligible and no-search-match states", () => {
    renderStep1({ eligibleQuestionnaires: [], visibleQuestionnaires: [], selectedQuestionnaire: null, selectedTemplateId: "" });
    expect(screen.getByText(/No eligible questionnaire found yet/i)).toBeInTheDocument();

    renderStep1({ visibleQuestionnaires: [], questionnaireSearch: "missing" });
    expect(screen.getByText(/No questionnaire matches your search/i)).toBeInTheDocument();
  });

  it("shows coverage warnings for no vacant and no responses", () => {
    renderStep1({ coverage: { totalAvailableStudents: 0, respondingStudents: 0, nonRespondingStudents: 0, responseRate: 0, responseThreshold: 80 } });
    expect(screen.getByText(/No vacant students are currently available/i)).toBeInTheDocument();

    renderStep1({ coverage: { totalAvailableStudents: 3, respondingStudents: 0, nonRespondingStudents: 3, responseRate: 0, responseThreshold: 80 } });
    expect(screen.getByText(/No available students have completed this questionnaire yet/i)).toBeInTheDocument();
  });

  it("changes non-respondent strategy by radio selection", () => {
    const props = renderStep1();
    fireEvent.click(screen.getByRole("radio", { name: /Exclude from allocation/i }));
    expect(props.onNonRespondentStrategyChange).toHaveBeenCalledWith("exclude");
  });

  it("renders stale preview warning and unassigned student details", () => {
    renderStep3();
    expect(screen.getByText(/Inputs changed since last preview/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be assigned with the current team size limits/i)).toBeInTheDocument();
    expect(screen.getAllByText("No questionnaire response").length).toBeGreaterThan(0);
    expect(screen.getByText("Responded")).toBeInTheDocument();
    expect(screen.queryByText("Question 1")).not.toBeInTheDocument();
  });
});