import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationQuestionnaireStep } from "./StaffCustomisedAllocationQuestionnaireStep";

const template = {
  id: 101,
  templateName: "Team Setup",
  ownerId: 1,
  isPublic: false,
  eligibleQuestionCount: 1,
  eligibleQuestions: [{ id: 1, label: "Preferred style", type: "multiple-choice" as const }],
};

const baseProps: ComponentProps<typeof StaffCustomisedAllocationQuestionnaireStep> = {
  questionnaireSearch: "",
  onQuestionnaireSearchChange: vi.fn(),
  selectedTemplateId: "",
  onSelectTemplate: vi.fn(),
  isLoadingQuestionnaires: false,
  eligibleQuestionnaires: [template],
  visibleQuestionnaires: [template],
  selectedQuestionnaire: template,
  activeCriteriaCount: 1,
  isLoadingCoverage: false,
  coverageError: "",
  loadError: "",
  coverage: null,
  hasLowCoverage: false,
  nonRespondentStrategy: "distribute_randomly",
  onNonRespondentStrategyChange: vi.fn(),
  confirmApply: false,
  isPreviewPending: false,
  isApplyPending: false,
};

function renderStep(
  overrides: Partial<ComponentProps<typeof StaffCustomisedAllocationQuestionnaireStep>> = {},
) {
  const props = { ...baseProps, ...overrides };
  render(<StaffCustomisedAllocationQuestionnaireStep {...props} />);
  return props;
}

describe("StaffCustomisedAllocationQuestionnaireStep", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading and empty-state messages", () => {
    renderStep({ isLoadingQuestionnaires: true, eligibleQuestionnaires: [], visibleQuestionnaires: [] });
    expect(screen.getByText("Loading questionnaires...")).toBeInTheDocument();
    expect(screen.queryByText(/No eligible questionnaire found yet/i)).not.toBeInTheDocument();
  });

  it("forwards questionnaire search, select, and strategy events", () => {
    const props = renderStep();
    fireEvent.change(screen.getByLabelText("Search questionnaires"), { target: { value: "team" } });
    fireEvent.change(screen.getByLabelText("Select questionnaire"), { target: { value: "101" } });
    fireEvent.click(screen.getByLabelText("Exclude from allocation"));
    expect(props.onQuestionnaireSearchChange).toHaveBeenCalledWith("team");
    expect(props.onSelectTemplate).toHaveBeenCalledWith("101");
    expect(props.onNonRespondentStrategyChange).toHaveBeenCalledWith("exclude");
  });

  it("renders coverage metadata and low-coverage warning", () => {
    renderStep({
      coverage: {
        project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
        questionnaireTemplateId: 101,
        totalAvailableStudents: 4,
        respondingStudents: 3,
        nonRespondingStudents: 1,
        responseRate: 75,
        responseThreshold: 80,
      },
      hasLowCoverage: true,
    });
    expect(screen.getByText("4 available students")).toBeInTheDocument();
    expect(screen.getByText("3 responded")).toBeInTheDocument();
    expect(screen.getByText(/Coverage is below 80%/i)).toBeInTheDocument();
  });
});