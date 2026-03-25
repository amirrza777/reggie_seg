import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanel } from "./StaffCustomisedAllocationPanel";

const refreshMock = vi.fn();
const emitRefreshMock = vi.fn();

const getCustomAllocationQuestionnairesMock = vi.fn();
const getCustomAllocationCoverageMock = vi.fn();
const previewCustomAllocationMock = vi.fn();
const applyCustomAllocationMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./allocationDraftEvents", () => ({
  emitStaffAllocationDraftsRefresh: () => emitRefreshMock(),
}));

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getCustomAllocationQuestionnaires: (...args: unknown[]) =>
    getCustomAllocationQuestionnairesMock(...args),
  getCustomAllocationCoverage: (...args: unknown[]) => getCustomAllocationCoverageMock(...args),
  previewCustomAllocation: (...args: unknown[]) => previewCustomAllocationMock(...args),
  applyCustomAllocation: (...args: unknown[]) => applyCustomAllocationMock(...args),
}));

const questionnaireResponse = {
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
};

describe("StaffCustomisedAllocationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCustomAllocationQuestionnairesMock.mockResolvedValue(questionnaireResponse);
    getCustomAllocationCoverageMock.mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 4,
      respondingStudents: 3,
      nonRespondingStudents: 1,
      responseRate: 75,
      responseThreshold: 80,
    });
  });

  it("loads questionnaires and filters them by search query", async () => {
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });

    expect(screen.getByRole("option", { name: /Project Preferences/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search questionnaires"), {
      target: { value: "setup" },
    });

    expect(screen.getByRole("option", { name: /Team Setup/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Project Preferences/i })).not.toBeInTheDocument();
  });

  it("loads coverage after questionnaire selection and shows the coverage warning", async () => {
    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });

    fireEvent.change(screen.getByLabelText("Select questionnaire"), {
      target: { value: "101" },
    });

    await waitFor(() => {
      expect(getCustomAllocationCoverageMock).toHaveBeenCalledWith(9, 101);
    });

    expect(screen.getByText("4 available students")).toBeInTheDocument();
    expect(screen.getByText("3 responded")).toBeInTheDocument();
    expect(screen.getByText("1 no response")).toBeInTheDocument();
    expect(screen.getByText("75% coverage")).toBeInTheDocument();
    expect(screen.getByText(/Coverage is below 80% \(75%\)/i)).toBeInTheDocument();
  });

  it("requests and renders a customised preview", async () => {
    previewCustomAllocationMock.mockResolvedValue({
      previewId: "custom-preview-1",
      teamCount: 2,
      respondentCount: 3,
      nonRespondentCount: 1,
      overallScore: 0.82,
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
              summary: { kind: "categorical", categories: [{ value: "Async", count: 1 }] },
            },
          ],
        },
      ],
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
      unassignedStudents: [],
    });

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });
    fireEvent.change(screen.getByLabelText("Select questionnaire"), {
      target: { value: "101" },
    });
    await waitFor(() => {
      expect(getCustomAllocationCoverageMock).toHaveBeenCalledWith(9, 101);
    });

    fireEvent.click(screen.getByRole("button", { name: /preview customised teams/i }));

    await waitFor(() => {
      expect(previewCustomAllocationMock).toHaveBeenCalledWith(9, {
        questionnaireTemplateId: 101,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 1, strategy: "diversify", weight: 1 }],
      });
    });

    expect(screen.getByText("Custom Team 1")).toBeInTheDocument();
    expect(screen.getByText("Jin Johannesdottir")).toBeInTheDocument();
    expect(screen.getByText("No questionnaire response")).toBeInTheDocument();
    expect(screen.getByText("Quality: Good (82%)")).toBeInTheDocument();
    expect(screen.getByText("diversify • weight 1 • 80%")).toBeInTheDocument();
    expect(screen.getByText("diversify • 1w • Async: 1")).toBeInTheDocument();
  });

  it("applies a confirmed preview and refreshes the workspace", async () => {
    previewCustomAllocationMock.mockResolvedValue({
      previewId: "custom-preview-1",
      teamCount: 2,
      respondentCount: 2,
      nonRespondentCount: 0,
      overallScore: 0.7,
      criteriaSummary: [{ questionId: 1, strategy: "diversify", weight: 1, satisfactionScore: 0.7 }],
      teamCriteriaSummary: [],
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
      unassignedStudents: [],
    });
    applyCustomAllocationMock.mockResolvedValue({
      appliedTeams: [
        { id: 1, teamName: "Team Orion", memberCount: 1 },
        { id: 2, teamName: "Custom Team 2", memberCount: 1 },
      ],
    });

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(getCustomAllocationQuestionnairesMock).toHaveBeenCalledWith(9);
    });
    fireEvent.change(screen.getByLabelText("Select questionnaire"), {
      target: { value: "101" },
    });
    await waitFor(() => {
      expect(getCustomAllocationCoverageMock).toHaveBeenCalledWith(9, 101);
    });
    fireEvent.click(screen.getByRole("button", { name: /preview customised teams/i }));

    await waitFor(() => {
      expect(screen.getByText("Custom Team 1")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Rename" })[0]).toBeEnabled();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    fireEvent.change(screen.getByLabelText("Custom team 1 name"), {
      target: { value: "Team Orion" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    fireEvent.click(screen.getByRole("button", { name: /confirm allocation/i }));
    fireEvent.click(screen.getByRole("button", { name: /save draft allocation/i }));

    await waitFor(() => {
      expect(applyCustomAllocationMock).toHaveBeenCalledWith(9, {
        previewId: "custom-preview-1",
        teamNames: ["Team Orion", "Custom Team 2"],
      });
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(emitRefreshMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saved customised allocation as draft across 2 teams.")).toBeInTheDocument();
  });

  it("shows a load error when questionnaires cannot be fetched", async () => {
    getCustomAllocationQuestionnairesMock.mockRejectedValue(new Error("boom"));

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });
});
