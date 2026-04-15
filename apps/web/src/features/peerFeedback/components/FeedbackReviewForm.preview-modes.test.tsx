import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { FeedbackReviewForm } from "./FeedbackReviewForm";
import type { PeerFeedback } from "../types";

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({
    onChange,
    onEmptyChange,
    placeholder,
  }: {
    onChange: (v: string) => void;
    onEmptyChange?: (e: boolean) => void;
    placeholder?: string;
  }) => (
    <textarea
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        onEmptyChange?.(e.target.value.trim().length === 0);
      }}
    />
  ),
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <p>{content}</p>,
}));

const push = vi.fn();
const back = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back, refresh }),
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

describe("FeedbackReviewForm (preview modes)", () => {
  beforeEach(() => {
    push.mockReset();
    back.mockReset();
    refresh.mockReset();
    submitPeerFeedbackMock.mockReset();
    submitPeerFeedbackMock.mockResolvedValue({ ok: true } as any);
  });

  it("renders uncovered answer preview modes and updates agreement selection", async () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback({
          answers: [
            {
              id: "empty-mcq",
              questionId: "empty-mcq",
              order: 1,
              question: "Empty options",
              type: "multiple-choice",
              configs: { options: [] },
              answer: "Custom",
            },
            {
              id: "rating-invalid",
              questionId: "rating-invalid",
              order: 2,
              question: "Rating with invalid answer",
              type: "rating",
              configs: { min: 5, max: 3 },
              answer: "not-a-number",
            },
            {
              id: "rating-string",
              questionId: "rating-string",
              order: 3,
              question: "Rating with string answer",
              type: "rating",
              configs: { min: 1, max: 3 },
              answer: "2",
            },
            {
              id: "slider-basic",
              questionId: "slider-basic",
              order: 4,
              question: "Slider no labels",
              type: "slider",
              configs: { min: 0, max: 10, step: 2 },
              answer: 6,
            },
          ],
        })}
        currentUserId="4"
      />,
    );

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: "5" })).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "2" })).toBeChecked();
    expect(screen.getByRole("slider")).toHaveValue("6");

    fireEvent.change(screen.getByLabelText("Agreement with: Empty options"), {
      target: { value: "Strongly Agree" },
    });
    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Agreement changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(submitPeerFeedbackMock).toHaveBeenCalledWith(
        "21",
        expect.objectContaining({
          agreements: expect.objectContaining({
            "empty-mcq": { selected: "Strongly Agree", score: 5 },
          }),
        }),
        "4",
        "9",
      );
    });
  });

  it("covers fallback branches for malformed configs and missing answers", () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback({
          answers: [
            {
              id: "mcq-malformed",
              questionId: "mcq-malformed",
              order: 1,
              question: "Malformed MCQ",
              type: "multiple-choice",
              configs: { options: "invalid" as any },
              answer: null,
            },
            {
              id: "rating-defaults",
              questionId: "rating-defaults",
              order: 2,
              question: "Rating defaults",
              type: "rating",
              configs: {},
              answer: null,
            },
            {
              id: "slider-defaults",
              questionId: "slider-defaults",
              order: 3,
              question: "Slider defaults",
              type: "slider",
              configs: { min: 10, max: 5, step: 0, helperText: "Slide it" },
              answer: null,
            },
            {
              id: "text-placeholder",
              questionId: "text-placeholder",
              order: 4,
              question: "Text placeholder",
              type: "text",
              configs: { placeholder: "Optional" },
              answer: null,
            },
          ],
        })}
        currentUserId="4"
      />,
    );

    expect(screen.getByText("No response")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: "1" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("slider")).toHaveValue("10");
    expect(screen.getByText("Slide it")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Optional")).toHaveValue("");
  });

  it("supports initial agreements by questionId and answer id in view mode", () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback({
          answers: [
            {
              id: "a1",
              questionId: "qid-1",
              order: 1,
              question: "Question one",
              answer: "A",
            },
            {
              id: "a2",
              questionId: "qid-2",
              order: 2,
              question: "Question two",
              answer: "B",
            },
          ],
        })}
        currentUserId="4"
        initialReview="Read only review"
        initialAgreements={{
          "qid-1": { selected: "Agree", score: 4 },
          a2: { selected: "Strongly Disagree", score: 1 },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "View Review" })).toBeInTheDocument();
    expect(screen.getByText("Agree")).toBeInTheDocument();
    expect(screen.getByText("Strongly Disagree")).toBeInTheDocument();
  });

  it("handles missing answers array and invalid deadline strings", () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback({ answers: undefined as any })}
        currentUserId="4"
        feedbackOpenAt="not-a-date"
        feedbackDueAt="also-not-a-date"
      />,
    );
    expect(screen.queryByText("Communication")).not.toBeInTheDocument();
    expect(screen.queryByTestId("deadline-countdown")).not.toBeInTheDocument();
  });
});
