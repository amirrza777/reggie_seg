import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFeedbackReview,
  getPeerFeedbackById,
} from "@/features/peerFeedback/api/client";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import PeerFeedbackReview from "./page";

vi.mock("@/features/peerFeedback/api/client", () => ({
  getFeedbackReview: vi.fn(),
  getPeerFeedbackById: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProjectDeadline: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/peerFeedback/components/FeedbackReviewForm", () => ({
  FeedbackReviewForm: ({
    feedback,
    initialReview,
    initialAgreements,
    currentUserId,
    feedbackOpenAt,
    feedbackDueAt,
  }: {
    feedback: { id: string };
    initialReview?: string;
    initialAgreements?: unknown;
    currentUserId: string;
    feedbackOpenAt: string | null;
    feedbackDueAt: string | null;
  }) => (
    <div
      data-testid="feedback-review-form"
      data-feedback-id={feedback.id}
      data-initial-review={String(initialReview ?? "")}
      data-initial-agreements={JSON.stringify(initialAgreements ?? null)}
      data-current-user-id={currentUserId}
      data-open-at={String(feedbackOpenAt ?? "")}
      data-due-at={String(feedbackDueAt ?? "")}
    />
  ),
}));

const getFeedbackReviewMock = vi.mocked(getFeedbackReview);
const getPeerFeedbackByIdMock = vi.mocked(getPeerFeedbackById);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("PeerFeedbackReview page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeerFeedbackByIdMock.mockResolvedValue({
      id: "300",
      reviewerId: "11",
      revieweeId: "42",
      submittedAt: "2026-04-01T10:00:00.000Z",
      answers: [],
    } as Awaited<ReturnType<typeof getPeerFeedbackById>>);
  });

  it("renders form with existing review and deadline values", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      feedbackOpenDate: "2026-04-01T09:00:00.000Z",
      feedbackDueDate: "2026-04-10T09:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getFeedbackReviewMock.mockResolvedValue({
      reviewText: "Good evidence and clear comments.",
      agreementsJson: { q1: { selected: "Agree", score: 4 } },
    } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await PeerFeedbackReview({
      params: Promise.resolve({ feedbackId: "300", projectId: "19" }),
    });
    render(page);

    const form = screen.getByTestId("feedback-review-form");
    expect(form).toHaveAttribute("data-feedback-id", "300");
    expect(form).toHaveAttribute("data-initial-review", "Good evidence and clear comments.");
    expect(form).toHaveAttribute(
      "data-initial-agreements",
      '{"q1":{"selected":"Agree","score":4}}',
    );
    expect(form).toHaveAttribute("data-current-user-id", "9");
    expect(form).toHaveAttribute("data-open-at", "2026-04-01T09:00:00.000Z");
    expect(form).toHaveAttribute("data-due-at", "2026-04-10T09:00:00.000Z");
  });

  it("renders form without initial review when review lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 20 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline unavailable"));
    getFeedbackReviewMock.mockRejectedValue(new Error("review unavailable"));

    const page = await PeerFeedbackReview({
      params: Promise.resolve({ feedbackId: "300", projectId: "21" }),
    });
    render(page);

    const form = screen.getByTestId("feedback-review-form");
    expect(form).toHaveAttribute("data-initial-review", "");
    expect(form).toHaveAttribute("data-initial-agreements", "null");
    expect(form).toHaveAttribute("data-current-user-id", "20");
    expect(form).toHaveAttribute("data-open-at", "");
    expect(form).toHaveAttribute("data-due-at", "");
  });

  it("uses reviewee id as current user id when session user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    getFeedbackReviewMock.mockResolvedValue({
      reviewText: "Existing review from anonymous flow",
      agreementsJson: { q2: { selected: "Reasonable", score: 3 } },
    } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await PeerFeedbackReview({
      params: Promise.resolve({ feedbackId: "300", projectId: "21" }),
    });
    render(page);

    const form = screen.getByTestId("feedback-review-form");
    expect(form).toHaveAttribute("data-current-user-id", "42");
    expect(getProjectDeadlineMock).not.toHaveBeenCalled();
  });

  it("normalizes null existing review values to empty initial props", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 15 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      feedbackOpenDate: "2026-05-01T09:00:00.000Z",
      feedbackDueDate: "2026-05-10T09:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getFeedbackReviewMock.mockResolvedValue({
      reviewText: null,
      agreementsJson: null,
    } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await PeerFeedbackReview({
      params: Promise.resolve({ feedbackId: "300", projectId: "88" }),
    });
    render(page);

    const form = screen.getByTestId("feedback-review-form");
    expect(form).toHaveAttribute("data-initial-review", "");
    expect(form).toHaveAttribute("data-initial-agreements", "null");
  });
});
