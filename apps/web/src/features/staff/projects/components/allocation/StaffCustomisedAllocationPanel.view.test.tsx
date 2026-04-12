import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanel } from "./StaffCustomisedAllocationPanel";
import { useCustomisedAllocation } from "./useCustomisedAllocation";

vi.mock("./useCustomisedAllocation", () => ({ useCustomisedAllocation: vi.fn() }));
vi.mock("./StaffCustomisedAllocationPanel.step1", () => ({
  StaffCustomisedAllocationPanelStep1: () => <div data-testid="step1" />,
}));
vi.mock("./StaffCustomisedAllocationPanel.step2", () => ({
  StaffCustomisedAllocationPanelStep2: () => <div data-testid="step2" />,
}));
vi.mock("./StaffCustomisedAllocationPanel.step3", () => ({
  StaffCustomisedAllocationPanelStep3: () => <div data-testid="step3" />,
}));

const minimalHook = {
  isLoadingQuestionnaires: false, loadError: "", questionnaireSearch: "",
  setQuestionnaireSearch: vi.fn(), selectedTemplateId: "", onSelectTemplate: vi.fn(),
  coverage: null, isLoadingCoverage: false, coverageError: "",
  nonRespondentStrategy: "distribute_randomly", onNonRespondentStrategyChange: vi.fn(),
  criteriaConfigByQuestionId: {}, teamCountInput: "2", onTeamCountInputChange: vi.fn(),
  minTeamSizeInput: "", onMinTeamSizeInputChange: vi.fn(),
  maxTeamSizeInput: "", onMaxTeamSizeInputChange: vi.fn(),
  preview: null, teamNames: {}, renamingTeams: {}, confirmApply: false,
  errorMessage: "", successMessage: "", isPreviewPending: false, isApplyPending: false,
  eligibleQuestionnaires: [], selectedQuestionnaire: null, visibleQuestionnaires: [],
  criteriaQuestions: [], questionLabelById: new Map(),
  activeCriteriaCount: 0, canPreparePreview: false, hasLowCoverage: false,
  isPreviewCurrent: false, unassignedStudents: [],
  getTeamName: (_: number, name: string) => name,
  updateStrategy: vi.fn(), updateWeight: vi.fn(), toggleConfirmAllocation: vi.fn(),
  runPreview: vi.fn(), runApplyAllocation: vi.fn(),
  onTeamNameChange: vi.fn(), onToggleTeamRename: vi.fn(),
};

describe("StaffCustomisedAllocationPanel view", () => {
  beforeEach(() => {
    vi.mocked(useCustomisedAllocation).mockReturnValue(minimalHook as any);
  });

  it("renders all three allocation steps", () => {
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);
    expect(screen.getByTestId("step1")).toBeInTheDocument();
    expect(screen.getByTestId("step2")).toBeInTheDocument();
    expect(screen.getByTestId("step3")).toBeInTheDocument();
  });

  it("exposes the project id in the section aria-label", () => {
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);
    expect(
      screen.getByLabelText(/customised allocation panel for project 9/i),
    ).toBeInTheDocument();
  });
});