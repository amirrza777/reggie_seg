import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAllocationQuestionnaireCard } from "./TeamAllocationQuestionnaireCard";
import { submitTeamAllocationQuestionnaireResponse } from "@/features/projects/api/client";

vi.mock("@/features/projects/api/client", () => ({
  submitTeamAllocationQuestionnaireResponse: vi.fn(),
}));

const submitMock = vi.mocked(submitTeamAllocationQuestionnaireResponse);

type Questionnaire = {
  id: number;
  questions: Array<{
    id: number;
    label: string;
    type: string;
    configs?: unknown;
  }>;
};

const baseQuestionnaire: Questionnaire = {
  id: 51,
  questions: [{ id: 7, label: "Preferred role", type: "multiple-choice", configs: { options: ["A", "B"] } }],
};

function renderCard(questionnaire: Questionnaire = baseQuestionnaire, initialSubmitted = false) {
  render(
    <TeamAllocationQuestionnaireCard
      projectId={9}
      currentUserId={4}
      questionnaire={questionnaire}
      initialSubmitted={initialSubmitted}
    />,
  );
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: "Submit questionnaire" }));
}

describe("TeamAllocationQuestionnaireCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("shows submitted state when initialSubmitted is true", () => {
    renderCard(baseQuestionnaire, true);
    expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit questionnaire" })).not.toBeInTheDocument();
  });

  it("restores submitted state from session storage", async () => {
    window.sessionStorage.setItem("team-allocation-questionnaire-submitted:4:9:51", "1");
    renderCard();
    expect(await screen.findByText(/submitted successfully/i)).toBeInTheDocument();
  });

  it("falls back to initialSubmitted when session storage read fails", async () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new Error("read failed");
    });
    renderCard(baseQuestionnaire, false);
    await screen.findByRole("button", { name: "Submit questionnaire" });
    expect(screen.queryByText(/submitted successfully/i)).not.toBeInTheDocument();
    getSpy.mockRestore();
  });

  it("requires all questions to be answered before submit", async () => {
    renderCard();
    submitForm();
    expect(await screen.findByText("Please answer every question before submitting.")).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("shows unsupported question message for text questions", async () => {
    const unsupported: Questionnaire = { id: 9, questions: [{ id: 1, label: "About you", type: "text" }] };
    renderCard(unsupported);
    submitForm();
    expect(await screen.findByText(/unsupported text questions/i)).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("submits multiple-choice responses and stores submitted state", async () => {
    submitMock.mockResolvedValue(undefined);
    renderCard();
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    submitForm();
    await waitFor(() => expect(submitMock).toHaveBeenCalledWith(9, { 7: "A" }));
    expect(await screen.findByText(/submitted successfully/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem("team-allocation-questionnaire-submitted:4:9:51")).toBe("1");
  });

  it("supports multiple_choice alias and uses fallback for invalid option lists", async () => {
    const alias: Questionnaire = {
      id: 52,
      questions: [{ id: 4, label: "Alias", type: "multiple_choice", configs: { options: "bad" } }],
    };
    renderCard(alias);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    submitForm();
    expect(await screen.findByText("Please answer every question before submitting.")).toBeInTheDocument();
  });

  it("submits rating and slider numeric values", async () => {
    submitMock.mockResolvedValue(undefined);
    const advanced: Questionnaire = {
      id: 53,
      questions: [
        { id: 1, label: "Rating", type: "rating", configs: { min: 1, max: 3 } },
        { id: 2, label: "Slider", type: "slider", configs: { min: 0, max: 10, step: 1 } },
      ],
    };
    renderCard(advanced);
    fireEvent.click(screen.getByRole("radio", { name: "2" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "7" } });
    submitForm();
    await waitFor(() => expect(submitMock).toHaveBeenCalledWith(9, { 1: 2, 2: 7 }));
  });

  it("shows server error message and fallback non-error message", async () => {
    submitMock.mockRejectedValueOnce(new Error("Server said no")).mockRejectedValueOnce("bad");
    const { rerender } = render(<TeamAllocationQuestionnaireCard projectId={9} currentUserId={4} questionnaire={baseQuestionnaire} />);
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    submitForm();
    expect(await screen.findByText("Server said no")).toBeInTheDocument();

    rerender(<TeamAllocationQuestionnaireCard projectId={9} currentUserId={4} questionnaire={baseQuestionnaire} />);
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    submitForm();
    expect(await screen.findByText("Failed to submit response.")).toBeInTheDocument();
  });

  it("continues after session storage write failures", async () => {
    submitMock.mockResolvedValue(undefined);
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("write failed");
    });
    renderCard();
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    submitForm();
    expect(await screen.findByText(/submitted successfully/i)).toBeInTheDocument();
    setSpy.mockRestore();
  });
});