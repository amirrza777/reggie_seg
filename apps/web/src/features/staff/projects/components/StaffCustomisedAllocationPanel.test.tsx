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

  it("filters questionnaire options via searchable input", async () => {
    getCustomAllocationQuestionnairesMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaires: [
        {
          id: 101,
          templateName: "Team Setup",
          ownerId: 1,
          isPublic: false,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 1, label: "Preferred working style", type: "multiple-choice" }],
        },
        {
          id: 202,
          templateName: "Project Preferences",
          ownerId: 1,
          isPublic: false,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 2, label: "Timezone", type: "rating" }],
        },
      ],
    });
    getCustomAllocationCoverageMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 2,
      respondingStudents: 2,
      nonRespondingStudents: 0,
      responseRate: 100,
      responseThreshold: 80,
    });
    previewCustomAllocationMock.mockResolvedValue({});
    applyCustomAllocationMock.mockResolvedValue({});

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });

    expect(screen.getByRole("option", { name: /Team Setup/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Project Preferences/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search questionnaires"), {
      target: { value: "setup" },
    });

    expect(screen.getByRole("option", { name: /Team Setup/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Project Preferences/i })).not.toBeInTheDocument();
  });

  it("requests and renders customised preview results", async () => {
    getCustomAllocationQuestionnairesMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaires: [
        {
          id: 101,
          templateName: "Team Setup",
          ownerId: 1,
          isPublic: false,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 1, label: "Preferred working style", type: "multiple-choice" }],
        },
      ],
    });
    getCustomAllocationCoverageMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 4,
      respondingStudents: 3,
      nonRespondingStudents: 1,
      responseRate: 75,
      responseThreshold: 80,
    });
    previewCustomAllocationMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      previewId: "custom-preview-1",
      generatedAt: "2026-03-16T12:00:00.000Z",
      expiresAt: "2026-03-16T12:15:00.000Z",
      teamCount: 2,
      respondentCount: 3,
      nonRespondentCount: 1,
      nonRespondentStrategy: "distribute_randomly",
      criteriaSummary: [{ questionId: 1, strategy: "diversify", weight: 1, satisfactionScore: 0.8 }],
      teamCriteriaSummary: [
        {
          teamIndex: 0,
          criteria: [
            {
              questionId: 1,
              strategy: "diversify",
              weight: 1,
              responseCount: 1,
              summary: {
                kind: "categorical",
                categories: [{ value: "Async", count: 1 }],
              },
            },
          ],
        },
        {
          teamIndex: 1,
          criteria: [
            {
              questionId: 1,
              strategy: "diversify",
              weight: 1,
              responseCount: 1,
              summary: {
                kind: "categorical",
                categories: [{ value: "Hybrid", count: 1 }],
              },
            },
          ],
        },
      ],
      overallScore: 0.82,
      previewTeams: [
        {
          index: 0,
          suggestedName: "Custom Team 1",
          members: [
            { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com", responseStatus: "RESPONDED" },
            { id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com", responseStatus: "NO_RESPONSE" },
          ],
        },
        {
          index: 1,
          suggestedName: "Custom Team 2",
          members: [{ id: 13, firstName: "Rachel", lastName: "Yin", email: "rachel@example.com", responseStatus: "RESPONDED" }],
        },
      ],
    });
    applyCustomAllocationMock.mockResolvedValue({});

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });
    fireEvent.change(screen.getByLabelText("Select questionnaire"), { target: { value: "101" } });
    await waitFor(() => {
      expect(getCustomAllocationCoverageMock).toHaveBeenCalledWith(9, 101);
    });

    fireEvent.change(screen.getByLabelText("Customised team count"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Customised seed"), { target: { value: "2026" } });
    fireEvent.click(screen.getByRole("button", { name: /preview customised teams/i }));

    await waitFor(() => {
      expect(previewCustomAllocationMock).toHaveBeenCalledWith(9, {
        questionnaireTemplateId: 101,
        teamCount: 2,
        seed: 2026,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 1, strategy: "diversify", weight: 1 }],
      });
    });

    expect(screen.getByText("Custom Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
    expect(screen.getByText("No questionnaire response")).toBeInTheDocument();
    expect(screen.getByText("Quality: Good (82%)")).toBeInTheDocument();
    expect(screen.getByText("diversify • weight 1 • 80%")).toBeInTheDocument();
    expect(screen.getAllByText("Criteria breakdown")).toHaveLength(2);
    expect(screen.getByText("diversify • 1w • Async: 1")).toBeInTheDocument();
  });

  it("applies customised allocation after confirm and rename", async () => {
    getCustomAllocationQuestionnairesMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaires: [
        {
          id: 101,
          templateName: "Team Setup",
          ownerId: 1,
          isPublic: false,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 1, label: "Preferred working style", type: "multiple-choice" }],
        },
      ],
    });
    getCustomAllocationCoverageMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 2,
      respondingStudents: 2,
      nonRespondingStudents: 0,
      responseRate: 100,
      responseThreshold: 80,
    });
    previewCustomAllocationMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      previewId: "custom-preview-1",
      generatedAt: "2026-03-16T12:00:00.000Z",
      expiresAt: "2026-03-16T12:15:00.000Z",
      teamCount: 2,
      respondentCount: 2,
      nonRespondentCount: 0,
      nonRespondentStrategy: "distribute_randomly",
      criteriaSummary: [{ questionId: 1, strategy: "diversify", weight: 1, satisfactionScore: 0.7 }],
      teamCriteriaSummary: [
        {
          teamIndex: 0,
          criteria: [
            {
              questionId: 1,
              strategy: "diversify",
              weight: 1,
              responseCount: 1,
              summary: {
                kind: "numeric",
                average: 4,
                min: 4,
                max: 4,
              },
            },
          ],
        },
        {
          teamIndex: 1,
          criteria: [
            {
              questionId: 1,
              strategy: "diversify",
              weight: 1,
              responseCount: 1,
              summary: {
                kind: "numeric",
                average: 2,
                min: 2,
                max: 2,
              },
            },
          ],
        },
      ],
      overallScore: 0.7,
      previewTeams: [
        {
          index: 0,
          suggestedName: "Custom Team 1",
          members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com", responseStatus: "RESPONDED" }],
        },
        {
          index: 1,
          suggestedName: "Custom Team 2",
          members: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com", responseStatus: "RESPONDED" }],
        },
      ],
    });
    applyCustomAllocationMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      previewId: "custom-preview-1",
      studentCount: 2,
      teamCount: 2,
      appliedTeams: [
        { id: 1, teamName: "Team Orion", memberCount: 1 },
        { id: 2, teamName: "Custom Team 2", memberCount: 1 },
      ],
    });

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });
    fireEvent.change(screen.getByLabelText("Select questionnaire"), { target: { value: "101" } });
    await waitFor(() => {
      expect(getCustomAllocationCoverageMock).toHaveBeenCalledWith(9, 101);
    });
    fireEvent.click(screen.getByRole("button", { name: /preview customised teams/i }));
    await waitFor(() => {
      expect(previewCustomAllocationMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /preview customised teams/i })).toBeEnabled();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    fireEvent.change(screen.getByLabelText("Custom team 1 name"), { target: { value: "Team Orion" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const applyButton = screen.getByRole("button", { name: /apply allocation/i });
    expect(applyButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(applyCustomAllocationMock).toHaveBeenCalledWith(9, {
        previewId: "custom-preview-1",
        teamNames: ["Team Orion", "Custom Team 2"],
      });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Applied customised allocation across 2 teams.")).toBeInTheDocument();
  });

  it("shows an error when questionnaire loading fails", async () => {
    getCustomAllocationQuestionnairesMock.mockRejectedValue(new Error("boom"));
    getCustomAllocationCoverageMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 0,
      respondingStudents: 0,
      nonRespondingStudents: 0,
      responseRate: 0,
      responseThreshold: 80,
    });
    previewCustomAllocationMock.mockResolvedValue({});
    applyCustomAllocationMock.mockResolvedValue({});

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });

  it("shows stale-student details when apply fails due to vacancy conflicts", async () => {
    getCustomAllocationQuestionnairesMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaires: [
        {
          id: 101,
          templateName: "Team Setup",
          ownerId: 1,
          isPublic: false,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 1, label: "Preferred working style", type: "multiple-choice" }],
        },
      ],
    });
    getCustomAllocationCoverageMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 2,
      respondingStudents: 2,
      nonRespondingStudents: 0,
      responseRate: 100,
      responseThreshold: 80,
    });
    previewCustomAllocationMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      previewId: "custom-preview-1",
      generatedAt: "2026-03-16T12:00:00.000Z",
      expiresAt: "2026-03-16T12:15:00.000Z",
      teamCount: 2,
      respondentCount: 2,
      nonRespondentCount: 0,
      nonRespondentStrategy: "distribute_randomly",
      criteriaSummary: [{ questionId: 1, strategy: "diversify", weight: 1, satisfactionScore: 0.7 }],
      teamCriteriaSummary: [],
      overallScore: 0.7,
      previewTeams: [
        {
          index: 0,
          suggestedName: "Custom Team 1",
          members: [{ id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com", responseStatus: "RESPONDED" }],
        },
        {
          index: 1,
          suggestedName: "Custom Team 2",
          members: [{ id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com", responseStatus: "RESPONDED" }],
        },
      ],
    });
    applyCustomAllocationMock.mockRejectedValue(
      new Error(
        "Some students are no longer vacant: Jin Johannesdottir. Regenerate preview and try again.",
      ),
    );
    expect(controlsPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ canPreparePreview: false }));
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