import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanel } from "./StaffCustomisedAllocationPanel";
const getCustomAllocationQuestionnairesMock = vi.fn();
const getCustomAllocationCoverageMock = vi.fn();
const previewCustomAllocationMock = vi.fn();
const applyCustomAllocationMock = vi.fn();
const refreshMock = vi.fn();
const PROJECT_SUMMARY = { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" } as const;
const TEAM_SETUP_QUESTIONNAIRE = {
  id: 101,
  templateName: "Team Setup",
  ownerId: 1,
  isPublic: false,
  eligibleQuestionCount: 1,
  eligibleQuestions: [{ id: 1, label: "Preferred working style", type: "multiple-choice" }],
} as const;

function mockQuestionnaires(questionnaires: any[] = [TEAM_SETUP_QUESTIONNAIRE]) {
  getCustomAllocationQuestionnairesMock.mockResolvedValue({
    project: PROJECT_SUMMARY,
    questionnaires,
  });
}

function mockCoverage(
  overrides: Partial<{
    totalAvailableStudents: number;
    respondingStudents: number;
    nonRespondingStudents: number;
    responseRate: number;
    responseThreshold: number;
  }> = {},
) {
  getCustomAllocationCoverageMock.mockResolvedValue({
    project: PROJECT_SUMMARY,
    questionnaireTemplateId: 101,
    totalAvailableStudents: 2,
    respondingStudents: 2,
    nonRespondingStudents: 0,
    responseRate: 100,
    responseThreshold: 80,
    ...overrides,
  });
}

function renderPanel(initialTeamCount = 2) {
  render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={initialTeamCount} />);
}

async function selectQuestionnaire(questionnaireId = 101) {
  await waitFor(() => {
    expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
  });
  fireEvent.change(screen.getByLabelText("Select questionnaire"), { target: { value: String(questionnaireId) } });
  await waitFor(() => {
    expect(getCustomAllocationCoverageMock).toHaveBeenCalledWith(9, questionnaireId);
  });
}

async function previewTeams() {
  fireEvent.click(screen.getByRole("button", { name: /preview customised teams/i }));
  await waitFor(() => {
    expect(previewCustomAllocationMock).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /preview customised teams/i })).toBeEnabled();
  });
}

const DEFAULT_PREVIEW_TEAMS = [
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
];

function createPreviewResult(overrides: Record<string, unknown> = {}) {
  return {
    project: PROJECT_SUMMARY,
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
    previewTeams: DEFAULT_PREVIEW_TEAMS,
    ...overrides,
  };
}

function confirmAndSubmitDraftAllocation() {
  fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
  fireEvent.click(screen.getByRole("button", { name: /save draft allocation/i }));
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getCustomAllocationQuestionnaires: (...args: unknown[]) =>
    getCustomAllocationQuestionnairesMock(...args),
  getCustomAllocationCoverage: (...args: unknown[]) => getCustomAllocationCoverageMock(...args),
  previewCustomAllocation: (...args: unknown[]) => previewCustomAllocationMock(...args),
  applyCustomAllocation: (...args: unknown[]) => applyCustomAllocationMock(...args),
}));

describe("StaffCustomisedAllocationPanel", () => {
  beforeEach(() => {
    getCustomAllocationQuestionnairesMock.mockReset();
    getCustomAllocationCoverageMock.mockReset();
    previewCustomAllocationMock.mockReset();
    applyCustomAllocationMock.mockReset();
    refreshMock.mockReset();
  });

  it("loads questionnaires, fetches coverage, and renders criteria controls", async () => {
    mockQuestionnaires();
    mockCoverage({
      totalAvailableStudents: 4,
      respondingStudents: 3,
      nonRespondingStudents: 1,
      responseRate: 75,
    });
    previewCustomAllocationMock.mockResolvedValue({});
    applyCustomAllocationMock.mockResolvedValue({});

    renderPanel(3);

    expect(screen.getByText("Loading questionnaires...")).toBeInTheDocument();
    await selectQuestionnaire();

    expect(screen.getByText("Preferred working style")).toBeInTheDocument();
    expect(screen.getByLabelText("Strategy for Preferred working style")).toHaveValue("diversify");
    expect(screen.getByLabelText("Weight for Preferred working style")).toHaveValue("1");
    expect(screen.getByText("4 available students")).toBeInTheDocument();
    expect(screen.getByText("3 responded")).toBeInTheDocument();
    expect(screen.getByText("1 no response")).toBeInTheDocument();
    expect(screen.getByText("75% coverage")).toBeInTheDocument();
    expect(screen.getByText("Coverage is below 80% (75%). You can still proceed.")).toBeInTheDocument();
  });

  it("renders eligible questionnaire options in alphabetical order", async () => {
    mockQuestionnaires([
      TEAM_SETUP_QUESTIONNAIRE,
      {
        id: 202,
        templateName: "Project Preferences",
        ownerId: 1,
        isPublic: false,
        eligibleQuestionCount: 1,
        eligibleQuestions: [{ id: 2, label: "Timezone", type: "rating" }],
      },
    ]);
    mockCoverage();
    previewCustomAllocationMock.mockResolvedValue({});
    applyCustomAllocationMock.mockResolvedValue({});

    renderPanel(2);
    await waitFor(() => expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9));

    expect(screen.getByRole("option", { name: /Team Setup/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Project Preferences/i })).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Select questionnaire");
    expect(options[1]).toHaveTextContent("Project Preferences");
    expect(options[2]).toHaveTextContent("Team Setup");
  });

  it("requests and renders customised preview results", async () => {
    mockQuestionnaires();
    mockCoverage({
      totalAvailableStudents: 4,
      respondingStudents: 3,
      nonRespondingStudents: 1,
      responseRate: 75,
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

    renderPanel(2);
    await waitFor(() => expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9));
    await waitFor(() => {
      expect(screen.getByLabelText("Select questionnaire")).toBeEnabled();
    });
    await selectQuestionnaire();

    fireEvent.change(screen.getByLabelText("Customised team count"), { target: { value: "2" } });
    await previewTeams();
    expect(previewCustomAllocationMock).toHaveBeenCalledWith(9, {
      questionnaireTemplateId: 101,
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [{ questionId: 1, strategy: "diversify", weight: 1 }],
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
    mockQuestionnaires();
    mockCoverage();
    previewCustomAllocationMock.mockResolvedValue(
      createPreviewResult({
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
      }),
    );
    applyCustomAllocationMock.mockResolvedValue({
      project: PROJECT_SUMMARY,
      previewId: "custom-preview-1",
      studentCount: 2,
      teamCount: 2,
      appliedTeams: [
        { id: 1, teamName: "Team Orion", memberCount: 1 },
        { id: 2, teamName: "Custom Team 2", memberCount: 1 },
      ],
    });

    renderPanel(2);
    await selectQuestionnaire();
    await previewTeams();

    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    fireEvent.change(screen.getByLabelText("Custom team 1 name"), { target: { value: "Team Orion" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const applyButton = screen.getByRole("button", { name: /save draft allocation/i });
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
    expect(screen.getByText("Saved customised allocation as draft across 2 teams.")).toBeInTheDocument();
  });

  it("shows an error when questionnaire loading fails", async () => {
    getCustomAllocationQuestionnairesMock.mockRejectedValue(new Error("boom"));
    mockCoverage({
      totalAvailableStudents: 0,
      respondingStudents: 0,
      nonRespondingStudents: 0,
      responseRate: 0,
    });
    previewCustomAllocationMock.mockResolvedValue({});
    applyCustomAllocationMock.mockResolvedValue({});

    renderPanel(2);

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });

  it("shows stale-student details when apply fails due to vacancy conflicts", async () => {
    mockQuestionnaires();
    mockCoverage();
    previewCustomAllocationMock.mockResolvedValue(createPreviewResult());
    applyCustomAllocationMock.mockRejectedValue(
      new Error(
        "Some students are no longer vacant: Jin Johannesdottir. Regenerate preview and try again.",
      ),
    );

    renderPanel(2);
    await selectQuestionnaire();
    await previewTeams();

    confirmAndSubmitDraftAllocation();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Some students are no longer vacant: Jin Johannesdottir. Regenerate preview and try again.",
        ),
      ).toBeInTheDocument();
    });
  });
});