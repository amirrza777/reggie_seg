import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { FeedbackReviewForm } from "./FeedbackReviewForm";
import type { PeerFeedback, PeerAssessmentReviewPayload } from "../types";

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({ onChange, onEmptyChange, placeholder }: { onChange: (v: string) => void; onEmptyChange?: (e: boolean) => void; placeholder?: string }) => (
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

describe("FeedbackReviewForm", () => {
  beforeEach(() => {
    push.mockReset();
    back.mockReset();
    refresh.mockReset();
    submitPeerFeedbackMock.mockReset();
    submitPeerFeedbackMock.mockResolvedValue({ ok: true } as any);
  });

  it("does not show the reviewer real name in the intro (anonymous Teammate label)", () => {
    render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);
    expect(screen.getByText(/Share your thoughts about this feedback from Teammate/)).toBeInTheDocument();
    expect(screen.queryByText(/Dan Student/)).not.toBeInTheDocument();
  });

  it("shows validation message if review text is empty", async () => {
    render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);

    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    expect(await screen.findByText("Please provide a review before submitting.")).toBeInTheDocument();
    expect(submitPeerFeedbackMock).not.toHaveBeenCalled();
  });

  it("submits peer feedback and navigates to feedback list by default", async () => {
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
        "9"
      );
    });

    expect(push).toHaveBeenCalledWith("/projects/1/peer-feedback");
    expect(refresh).toHaveBeenCalled();
  });

  it("navigates to explicit redirect path when provided", async () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        redirectTo="/projects/1/peer-feedback"
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Done" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/projects/1/peer-feedback");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("uses custom onSubmit handler when provided", async () => {
    const onSubmit = vi.fn<(_: PeerAssessmentReviewPayload) => Promise<void>>().mockResolvedValue(undefined);
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        onSubmit={onSubmit}
      />
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
        })
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
      />
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

  it("counts down to open, then due, then hides countdown after deadline", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-03-12T12:00:00.000Z"));

      render(
        <FeedbackReviewForm
          feedback={makeFeedback()}
          currentUserId="4"
          feedbackOpenAt="2026-03-12T12:00:03.000Z"
          feedbackDueAt="2026-03-12T12:00:06.000Z"
        />
      );

      expect(screen.getByTestId("deadline-countdown")).toHaveTextContent("00d : 00h : 00m : 03s");

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId("deadline-countdown")).toHaveTextContent("00d : 00h : 00m : 03s");

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(screen.queryByTestId("deadline-countdown")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Submit Review" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("locks submit when feedback window has not opened yet", async () => {
    const openAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        feedbackOpenAt={openAt}
        feedbackDueAt={dueAt}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Submit Review" });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/peer feedback is locked until/i)).toBeInTheDocument();

    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(submitPeerFeedbackMock).not.toHaveBeenCalled();
    });
  });

  it("shows read-only state after due date and hides submit/edit actions", async () => {
    const openAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const dueAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        feedbackOpenAt={openAt}
        feedbackDueAt={dueAt}
      />
    );

    expect(screen.queryByRole("button", { name: "Submit Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(submitPeerFeedbackMock).not.toHaveBeenCalled();
  });

  it("forces before-open and read-only submit guards when form submit is triggered", async () => {
    const openAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { container, rerender } = render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        feedbackOpenAt={openAt}
        feedbackDueAt={dueAt}
      />
    );
    fireEvent.submit(container.querySelector("form")!);
    expect((await screen.findAllByText(/Peer feedback is locked until/i)).length).toBeGreaterThan(0);

    rerender(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" readOnly />);
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("This feedback is read-only after the deadline.")).toBeInTheDocument();
  });

  it("submits and falls back to router.back when no project id exists", async () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback({ projectId: undefined })}
        currentUserId="4"
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "No project context" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    await waitFor(() => {
      expect(back).toHaveBeenCalled();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("submits using fallback project redirect when redirectTo is empty", async () => {
    render(
      <FeedbackReviewForm
        feedback={makeFeedback()}
        currentUserId="4"
        redirectTo=""
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Fallback redirect" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/projects/1/peer-feedback");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows API error message when submit fails", async () => {
    submitPeerFeedbackMock.mockRejectedValueOnce(new Error("API down"));
    render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);
    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Attempt submit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("API down")).toBeInTheDocument();
  });

  it("shows generic error message when submit throws a non-Error value", async () => {
    submitPeerFeedbackMock.mockRejectedValueOnce("failure");
    render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);
    fireEvent.change(screen.getByPlaceholderText("Type your response here..."), {
      target: { value: "Attempt submit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Failed to submit peer feedback")).toBeInTheDocument();
  });

  it("handles back navigation for both project and non-project feedback", () => {
    const withProject = render(<FeedbackReviewForm feedback={makeFeedback()} currentUserId="4" />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(push).toHaveBeenCalledWith("/projects/1/peer-feedback");
    withProject.unmount();

    render(<FeedbackReviewForm feedback={makeFeedback({ projectId: undefined })} currentUserId="4" />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(back).toHaveBeenCalled();
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
      />
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
        "9"
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
      />
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
      />
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
      />
    );
    expect(screen.queryByText("Communication")).not.toBeInTheDocument();
    expect(screen.queryByTestId("deadline-countdown")).not.toBeInTheDocument();
  });
});
