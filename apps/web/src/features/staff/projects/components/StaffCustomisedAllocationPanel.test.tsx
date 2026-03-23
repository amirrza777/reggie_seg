import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanel } from "./StaffCustomisedAllocationPanel";

const useCustomisedAllocationMock = vi.fn();
const questionnairePropsSpy = vi.fn();
const criteriaPropsSpy = vi.fn();
const controlsPropsSpy = vi.fn();
const resultsPropsSpy = vi.fn();

vi.mock("./useCustomisedAllocation", () => ({
  useCustomisedAllocation: (...args: unknown[]) => useCustomisedAllocationMock(...args),
}));

vi.mock("./StaffCustomisedAllocationQuestionnaireStep", () => ({
  StaffCustomisedAllocationQuestionnaireStep: (props: unknown) => {
    questionnairePropsSpy(props);
    return <div data-testid="questionnaire-step" />;
  },
}));

vi.mock("./StaffCustomisedAllocationCriteriaStep", () => ({
  StaffCustomisedAllocationCriteriaStep: (props: unknown) => {
    criteriaPropsSpy(props);
    return <div data-testid="criteria-step" />;
  },
}));

vi.mock("./StaffCustomisedAllocationControls", () => ({
  StaffCustomisedAllocationControls: (props: unknown) => {
    controlsPropsSpy(props);
    return <div data-testid="controls-step" />;
  },
}));

vi.mock("./StaffCustomisedAllocationResults", () => ({
  StaffCustomisedAllocationResults: (props: unknown) => {
    resultsPropsSpy(props);
    return <div data-testid="results-step" />;
  },
}));

const baseAllocation = {
  questionnaireSearch: "",
  setQuestionnaireSearch: vi.fn(),
  selectedTemplateId: "",
  onSelectTemplate: vi.fn(),
  isLoadingQuestionnaires: false,
  eligibleQuestionnaires: [],
  visibleQuestionnaires: [],
  selectedQuestionnaire: null,
  activeCriteriaCount: 0,
  isLoadingCoverage: false,
  coverageError: "",
  loadError: "",
  coverage: null,
  hasLowCoverage: false,
  nonRespondentStrategy: "distribute_randomly",
  onNonRespondentStrategyChange: vi.fn(),
  criteriaQuestions: [],
  criteriaConfigByQuestionId: {},
  updateStrategy: vi.fn(),
  updateWeight: vi.fn(),
  teamCountInput: "2",
  onTeamCountInputChange: vi.fn(),
  minTeamSizeInput: "",
  onMinTeamSizeInputChange: vi.fn(),
  maxTeamSizeInput: "",
  onMaxTeamSizeInputChange: vi.fn(),
  runPreview: vi.fn(),
  runApplyAllocation: vi.fn(),
  canPreparePreview: true,
  confirmApply: false,
  isPreviewPending: false,
  isApplyPending: false,
  isPreviewCurrent: true,
  preview: null,
  errorMessage: "",
  successMessage: "",
  unassignedStudents: [],
  questionLabelById: new Map<number, string>(),
  getTeamName: vi.fn(),
  renamingTeams: {},
  onTeamNameChange: vi.fn(),
  onToggleTeamRename: vi.fn(),
  toggleConfirmAllocation: vi.fn(),
  teamNames: {},
};

function setAllocation(overrides: Record<string, unknown> = {}) {
  useCustomisedAllocationMock.mockReturnValue({ ...baseAllocation, ...overrides });
}

describe("StaffCustomisedAllocationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAllocation();
  });

  it("calls useCustomisedAllocation with panel inputs", () => {
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={3} />);
    expect(useCustomisedAllocationMock).toHaveBeenCalledWith({ projectId: 9, initialTeamCount: 3 });
    expect(screen.getByLabelText("Customised allocation panel for project 9")).toBeInTheDocument();
  });

  it("renders questionnaire, criteria, and controls using hook state", () => {
    setAllocation({ selectedTemplateId: "101", activeCriteriaCount: 2, canPreparePreview: false });
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);
    expect(screen.getByTestId("questionnaire-step")).toBeInTheDocument();
    expect(screen.getByTestId("criteria-step")).toBeInTheDocument();
    expect(screen.getByTestId("controls-step")).toBeInTheDocument();
    expect(screen.queryByTestId("results-step")).not.toBeInTheDocument();
    expect(questionnairePropsSpy).toHaveBeenCalledWith(expect.objectContaining({ selectedTemplateId: "101" }));
    expect(criteriaPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ criteriaConfigByQuestionId: {}, confirmApply: false }),
    );
    expect(controlsPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ canPreparePreview: false }));
  });

  it("renders result step only when preview exists and forwards handlers", () => {
    const preview = {
      previewId: "pv-1",
      teamCount: 2,
      respondentCount: 2,
      nonRespondentCount: 0,
      overallScore: 0.8,
      criteriaSummary: [],
      teamCriteriaSummary: [],
      previewTeams: [],
      unassignedStudents: [],
    };
    setAllocation({ preview, confirmApply: true, unassignedStudents: [{ id: 1 }] });
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);
    expect(screen.getByTestId("results-step")).toBeInTheDocument();
    expect(resultsPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ preview, confirmApply: true, unassignedStudents: [{ id: 1 }] }),
    );
    expect(resultsPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ onTeamNameChange: baseAllocation.onTeamNameChange }),
    );
  });
});