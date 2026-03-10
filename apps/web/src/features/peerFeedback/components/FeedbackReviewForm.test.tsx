import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { FeedbackReviewForm } from "./FeedbackReviewForm";
import type { PeerFeedback, PeerAssessmentReviewPayload } from "../types";

const push = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
}));

vi.mock("../api/client", () => ({
  submitPeerFeedback: vi.fn(),
}));

import { submitPeerFeedback } from "../api/client";

const submitPeerFeedbackMock = submitPeerFeedback as MockedFunction<typeof submitPeerFeedback>;

function makeFeedback(overrides: Partial<PeerFeedback> = {}): PeerFeedback {
  return {
    id: "21",
    projectId: "1",
    reviewerId: "9",
    revieweeId: "4",
    submittedAt: "2026-03-01T12:00:00.000Z",
    firstName: "Dan",
    lastName: "Student",
    answers: [
      {
        id: "q1",
        order: 1,
        question: "Communication",
        answer: "Great communicator",
      },
    ],
    ...overrides,
  };
}

describe("FeedbackReviewForm", () => {
  beforeEach(() => {
    push.mockReset();
    back.mockReset();
    submitPeerFeedbackMock.mockReset();
    submitPeerFeedbackMock.mockResolvedValue({ ok: true } as any);
  });

  it("shows validation message if review text is empty", async () => {
    render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);

    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    expect(await screen.findByText("Please provide a review before submitting.")).toBeInTheDocument();
    expect(submitPeerFeedbackMock).not.toHaveBeenCalled();
  });

  it("submits peer feedback and navigates back by default", async () => {
    render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);

    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Thanks for the feedback." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(submitPeerFeedbackMock).toHaveBeenCalledWith(
        "21",
        expect.objectContaining({
          reviewText: "Thanks for the feedback.",
          agreements: expect.objectContaining({
            q1: { selected: "Reasonable", score: 3 },
          }),
        }),
        "4",
        "9",
      );
    });

    expect(back).toHaveBeenCalled();
  });

  it("navigates to explicit redirect path when provided", async () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        redirectTo="/projects/1/peer-feedback"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Done" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/projects/1/peer-feedback");
    });
  });

  it("uses custom onSubmit handler when provided", async () => {
    const onSubmit = vi.fn<(_: PeerAssessmentReviewPayload) => Promise<void>>().mockResolvedValue(undefined);
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Handled externally" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewText: "Handled externally",
          agreements: expect.objectContaining({
            q1: { selected: "Reasonable", score: 3 },
          }),
        }),
      );
    });
    expect(submitPeerFeedbackMock).not.toHaveBeenCalled();
  });

  it("supports view mode with initial review and edit flow", async () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        initialReview="Existing review"
      />,
    );

    expect(screen.getByRole("heading", { name: "View Review" })).toBeInTheDocument();
    expect(screen.getByText("Existing review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Respond to Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Review" })).toBeInTheDocument();
  });

  it("renders answer previews using question formats", () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback({
          answers: [
            {
              id: "mcq-1",
              questionId: "mcq-1",
              order: 1,
              question: "Did they contribute?",
              type: "multiple-choice",
              configs: { options: ["Yes", "No"] },
              answer: "Yes",
            },
            {
              id: "slider-1",
              questionId: "slider-1",
              order: 2,
              question: "How strongly do you agree?",
              type: "slider",
              configs: { min: 0, max: 100, step: 5, left: "Low", right: "High" },
              answer: 75,
            },
          ],
        })}
        currentUserId="4"
      />
    );

    expect(screen.getByRole("radio", { name: "Yes" })).toBeChecked();
    expect(screen.getByRole("slider")).toHaveValue("75");
  });
});
