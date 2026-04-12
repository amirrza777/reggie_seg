import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanelStep1 } from "./StaffCustomisedAllocationPanel.step1";

const questionnaire = {
  id: 101,
  templateName: "Team Setup",
  ownerId: 1,
  isPublic: true,
  eligibleQuestionCount: 2,
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
    selectedTemplateId: "",
    onSelectTemplate: vi.fn(),
    selectedQuestionnaire: null,
    activeCriteriaCount: 0,
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

describe("StaffCustomisedAllocationPanelStep1", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading skeleton while questionnaires are fetching", () => {
    renderStep1({ isLoadingQuestionnaires: true });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Loading questionnaires/i)).toBeInTheDocument();
  });

  it("shows a load error message", () => {
    renderStep1({ loadError: "Server error" });
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("shows badges for the selected questionnaire including public flag", () => {
    renderStep1({ selectedQuestionnaire: questionnaire, activeCriteriaCount: 1 });
    expect(screen.getByText("2 eligible criteria")).toBeInTheDocument();
    expect(screen.getByText("1 active criteria")).toBeInTheDocument();
    expect(screen.getByText("Public template")).toBeInTheDocument();
  });

  it("shows owned-template badge for non-public questionnaires", () => {
    renderStep1({ selectedQuestionnaire: { ...questionnaire, isPublic: false } });
    expect(screen.getByText("Owned template")).toBeInTheDocument();
  });

  it("shows coverage loading note while coverage is loading", () => {
    renderStep1({ isLoadingCoverage: true });
    expect(screen.getByText(/Loading response coverage/i)).toBeInTheDocument();
  });

  it("shows a coverage error message", () => {
    renderStep1({ coverageError: "Coverage failed" });
    expect(screen.getByText("Coverage failed")).toBeInTheDocument();
  });

  it("shows coverage summary badges when coverage is available", () => {
    const coverage = {
      totalAvailableStudents: 5,
      respondingStudents: 4,
      nonRespondingStudents: 1,
      responseRate: 80,
      responseThreshold: 80,
    };
    renderStep1({ coverage });
    expect(screen.getByText("5 available students")).toBeInTheDocument();
    expect(screen.getByText("4 responded")).toBeInTheDocument();
    expect(screen.getByText("80% coverage")).toBeInTheDocument();
  });

  it("shows low-coverage warning when coverage is below threshold", () => {
    const coverage = {
      totalAvailableStudents: 5,
      respondingStudents: 1,
      nonRespondingStudents: 4,
      responseRate: 20,
      responseThreshold: 80,
    };
    renderStep1({ coverage, hasLowCoverage: true });
    expect(screen.getByText(/Coverage is below 80%/i)).toBeInTheDocument();
  });

  it("disables radio buttons when confirmApply is true", () => {
    renderStep1({ confirmApply: true });
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });

  it("calls onNonRespondentStrategyChange when exclude radio is clicked", () => {
    const props = renderStep1();
    fireEvent.click(screen.getByRole("radio", { name: /Exclude from allocation/i }));
    expect(props.onNonRespondentStrategyChange).toHaveBeenCalledWith("exclude");
  });

  it("calls onSelectTemplate when a questionnaire is selected", () => {
    const props = renderStep1();
    fireEvent.change(screen.getByLabelText("Select questionnaire"), { target: { value: "101" } });
    expect(props.onSelectTemplate).toHaveBeenCalledWith("101");
  });
});