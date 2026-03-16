import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanel } from "./StaffCustomisedAllocationPanel";
import {
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
} from "@/features/projects/api/teamAllocation";

vi.mock("@/features/projects/api/teamAllocation", () => ({
  getCustomAllocationCoverage: vi.fn(),
  getCustomAllocationQuestionnaires: vi.fn(),
}));

describe("StaffCustomisedAllocationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads questionnaires, fetches coverage, and renders criteria controls", async () => {
    vi.mocked(getCustomAllocationQuestionnaires).mockResolvedValue({
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
          id: 103,
          templateName: "Preferences",
          ownerId: 2,
          isPublic: true,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 4, label: "Timezone compatibility", type: "rating" }],
        },
      ],
    });
    vi.mocked(getCustomAllocationCoverage).mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 4,
      respondingStudents: 3,
      nonRespondingStudents: 1,
      responseRate: 75,
      responseThreshold: 80,
    });

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={3} />);

    expect(screen.getByText("Loading questionnaires...")).toBeInTheDocument();
    await waitFor(() => {
      expect(getCustomAllocationQuestionnaires).toHaveBeenCalledWith(9);
    });

    expect(screen.getByRole("option", { name: /Team Setup \(1 criteria\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Preferences \(1 criteria\)/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Select questionnaire"), {
      target: { value: "101" },
    });

    await waitFor(() => {
      expect(getCustomAllocationCoverage).toHaveBeenCalledWith(9, 101);
    });

    expect(screen.getByText("Preferred working style")).toBeInTheDocument();
    expect(screen.getByLabelText("Strategy for Preferred working style")).toHaveValue("diversify");
    expect(screen.getByLabelText("Weight for Preferred working style")).toHaveValue("1");

    expect(screen.getByText("4 available students")).toBeInTheDocument();
    expect(screen.getByText("3 responded")).toBeInTheDocument();
    expect(screen.getByText("1 no response")).toBeInTheDocument();
    expect(screen.getByText("75% coverage")).toBeInTheDocument();
    expect(screen.getByText("Coverage is below 80% (75%). You can still proceed.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Strategy for Preferred working style"), {
      target: { value: "ignore" },
    });

    expect(screen.getByLabelText("Weight for Preferred working style")).toBeDisabled();
  });

  it("shows an error when questionnaire loading fails", async () => {
    vi.mocked(getCustomAllocationQuestionnaires).mockRejectedValue(new Error("boom"));
    vi.mocked(getCustomAllocationCoverage).mockResolvedValue({
      project: { id: 9, name: "Project A", moduleId: 3, moduleName: "Module A" },
      questionnaireTemplateId: 101,
      totalAvailableStudents: 0,
      respondingStudents: 0,
      nonRespondingStudents: 0,
      responseRate: 0,
      responseThreshold: 80,
    });

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });

  it("shows coverage error when coverage request fails", async () => {
    vi.mocked(getCustomAllocationQuestionnaires).mockResolvedValue({
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
    vi.mocked(getCustomAllocationCoverage).mockRejectedValue(new Error("coverage failed"));

    render(<StaffCustomisedAllocationPanel projectId={9} initialTeamCount={2} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Team Setup \(1 criteria\)/ })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Select questionnaire"), {
      target: { value: "101" },
    });

    await waitFor(() => {
      expect(screen.getByText("coverage failed")).toBeInTheDocument();
    });
  });
});