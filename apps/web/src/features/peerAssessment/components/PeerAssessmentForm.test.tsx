import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { ComponentProps } from "react";
import type { Question } from "../types";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("../api/client", () => ({
  createPeerAssessment: vi.fn(),
  updatePeerAssessment: vi.fn(),
}));

import { createPeerAssessment, updatePeerAssessment } from "../api/client";
import { PeerAssessmentForm } from "./PeerAssessmentForm";

const createPeerAssessmentMock = vi.mocked(createPeerAssessment);
const updatePeerAssessmentMock = vi.mocked(updatePeerAssessment);

const questions: Question[] = [
  { id: 1, text: "What went well?", type: "text", order: 0 },
  {
    id: 2,
    text: "Communication level",
    type: "multiple-choice",
    order: 1,
    configs: { options: ["Excellent", "Needs work"] },
  },
  {
    id: 3,
    text: "Technical contribution",
    type: "rating",
    order: 2,
    configs: { min: 1, max: 5 },
  },
  {
    id: 4,
    text: "Overall impact",
    type: "slider",
    order: 3,
    configs: { min: 0, max: 100, step: 5, left: "Low", right: "High" },
  },
];

function renderForm(
  overrides: Partial<ComponentProps<typeof PeerAssessmentForm>> = {}
) {
  return render(
    <PeerAssessmentForm
      teammateName="Alex Doe"
      questions={questions}
      projectId={10}
      teamId={20}
      reviewerId={30}
      revieweeId={40}
      templateId={50}
      {...overrides}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  createPeerAssessmentMock.mockResolvedValue({ ok: true } as unknown);
  updatePeerAssessmentMock.mockResolvedValue({ ok: true } as unknown);
});

describe("PeerAssessmentForm", () => {
  it("renders controls for text, multiple-choice, rating, and slider questions", () => {
    renderForm();

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Excellent" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5" })).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("submits numeric answers as numbers for rating and slider questions", async () => {
    renderForm();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Clear coding and communication." },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Excellent" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "80" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save assessment/i }));

    await waitFor(() =>
      expect(createPeerAssessmentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          teamId: 20,
          reviewerUserId: 30,
          revieweeUserId: 40,
          templateId: 50,
          answersJson: expect.arrayContaining([
            { question: "1", answer: "Clear coding and communication." },
            { question: "2", answer: "Excellent" },
            { question: "3", answer: 4 },
            { question: "4", answer: 80 },
          ]),
        })
      )
    );
  });

  it("does not allow submission until all questions are answered", async () => {
    renderForm();

    const submitButton = screen.getByRole("button", { name: /save assessment/i });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Clear coding and communication." },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Excellent" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));

    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "80" },
    });

    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    await waitFor(() => expect(createPeerAssessmentMock).toHaveBeenCalledTimes(1));
  });

  it("normalizes numeric edit answers and sends numbers on update", async () => {
    renderForm({
      assessmentId: 91,
      initialAnswers: {
        1: "Solid contribution.",
        2: "Needs work",
        3: "5",
        4: "60",
      },
    });

    expect(screen.getByRole("radio", { name: "5" })).toBeChecked();
    expect(screen.getByRole("slider")).toHaveValue("60");

    fireEvent.click(screen.getByRole("button", { name: /update assessment/i }));

    await waitFor(() =>
      expect(updatePeerAssessmentMock).toHaveBeenCalledWith(
        91,
        expect.objectContaining({
          1: "Solid contribution.",
          2: "Needs work",
          3: 5,
          4: 60,
        })
      )
    );
  });

  it("counts down to open, then due, then hides countdown after deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:00:00.000Z"));

    renderForm({
      assessmentOpenAt: "2026-03-11T12:00:03.000Z",
      assessmentDueAt: "2026-03-11T12:00:06.000Z",
    });

    expect(screen.getByTestId("deadline-countdown")).toHaveTextContent("00d : 00h : 00m : 03s");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("deadline-countdown")).toHaveTextContent("00d : 00h : 00m : 03s");

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByTestId("deadline-countdown")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("locks submission when assessment window has not opened yet", async () => {
    const openAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    renderForm({ assessmentOpenAt: openAt, assessmentDueAt: dueAt });

    const saveButton = screen.getByRole("button", { name: /save assessment/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/peer assessment is locked until/i)).toBeInTheDocument();

    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(createPeerAssessmentMock).not.toHaveBeenCalled();
    });
  });

  it("shows read-only state after due date and blocks submission", async () => {
    const openAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const dueAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    renderForm({ assessmentOpenAt: openAt, assessmentDueAt: dueAt });

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Late but submitted." },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Excellent" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "80" },
    });

    expect(screen.queryByRole("button", { name: /save assessment/i })).not.toBeInTheDocument();
    expect(createPeerAssessmentMock).not.toHaveBeenCalled();
  });

  it("resets answers with discard and clears previous status message", async () => {
    createPeerAssessmentMock.mockRejectedValueOnce(new Error("save failed"));

    renderForm({
      initialAnswers: {
        1: "Initial text",
        2: "Excellent",
        3: 3,
        4: 40,
      },
    });

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Changed text" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save assessment/i }));
    expect(await screen.findByText("save failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /discard changes/i }));
    expect(screen.getByRole("textbox")).toHaveValue("Initial text");
    expect(screen.queryByText("save failed")).not.toBeInTheDocument();
  });

  it("shows fallback save failure for non-Error values", async () => {
    createPeerAssessmentMock.mockRejectedValueOnce("network down" as never);
    renderForm({
      questions: [
        { id: 1, text: "Question", type: "text", order: 0 },
      ],
    });

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save assessment/i }));

    expect(await screen.findByText("Failed to save assessment")).toBeInTheDocument();
  });

  it("renders helper and empty-option states and supports back navigation", () => {
    renderForm({
      questions: [
        { id: 1, text: "Text question", type: "text", order: 0, configs: { helperText: "text help" } },
        { id: 2, text: "MC question", type: "multiple-choice", order: 1, configs: { options: [] } },
        { id: 3, text: "Rating question", type: "rating", order: 2, configs: { helperText: "rating help" } },
        { id: 4, text: "Slider question", type: "slider", order: 3, configs: { min: 0, max: 10, step: 1, helperText: "slider help" } },
      ] as any,
    });

    expect(screen.getByText("text help")).toBeInTheDocument();
    expect(screen.getByText("No options configured for this question.")).toBeInTheDocument();
    expect(screen.getByText("rating help")).toBeInTheDocument();
    expect(screen.getByText("slider help")).toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(push).toHaveBeenCalledWith("/projects/10/peer-assessments");
    expect(refresh).toHaveBeenCalled();
  });
});
