import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFeedbackReviewStatuses,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectPeerFeedbackPage from "./page";

vi.mock("@/features/peerFeedback/api/client", () => ({
  getFeedbackReviewStatuses: vi.fn(),
  getPeerAssessmentsForUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProjectDeadline: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/peerFeedback/components/FeedbackListView", () => ({
  FeedbackAssessmentView: ({
    feedbacks,
    projectId,
    listTitle,
    listDescription,
    readOnly,
  }: {
    feedbacks: Array<{ id: string; reviewSubmitted?: boolean }>;
    projectId: string;
    listTitle: string;
    listDescription: string;
    readOnly: boolean;
  }) => (
    <div
      data-testid="feedback-list-view"
      data-feedbacks={JSON.stringify(feedbacks)}
      data-project-id={projectId}
      data-list-title={listTitle}
      data-list-description={listDescription}
      data-read-only={String(readOnly)}
    />
  ),
}));

vi.mock("@/features/peerFeedback/components/PeerFeedbackTitleWithInfo", () => ({
  PeerFeedbackTitleWithInfo: ({ title }: { title: string }) => <span>{title}</span>,
}));

vi.mock("@/shared/ui/PageSection", () => ({
  PageSection: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <section>
      <h1>{title}</h1>
      <div>{children}</div>
    </section>
  ),
}));

const getFeedbackReviewStatusesMock = vi.mocked(getFeedbackReviewStatuses);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("ProjectPeerFeedbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeerAssessmentsForUserMock.mockResolvedValue([
      { id: "10", reviewerId: "5", revieweeId: "9", submittedAt: "2026-04-01T10:00:00.000Z", answers: [] },
      { id: "11", reviewerId: "5", revieweeId: "8", submittedAt: "2026-04-01T10:00:00.000Z", answers: [] },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getFeedbackReviewStatusesMock.mockResolvedValue({
      "10": true,
      "11": false,
    } as Awaited<ReturnType<typeof getFeedbackReviewStatuses>>);
  });

  it("shows sign-in prompt for unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectPeerFeedbackPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Peer Feedback" })).toBeInTheDocument();
    expect(screen.getByText("Please sign in to view peer feedback.")).toBeInTheDocument();
    expect(getPeerAssessmentsForUserMock).not.toHaveBeenCalled();
  });

  it("renders due+extension guidance and read-only mode for past due dates", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      feedbackDueDate: "2000-04-01T12:00:00.000Z",
      feedbackDueDateMcf: "2000-04-05T12:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await ProjectPeerFeedbackPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    const list = screen.getByTestId("feedback-list-view");
    expect(list).toHaveAttribute("data-project-id", "19");
    expect(list).toHaveAttribute("data-list-title", "List of peer feedback");
    expect(list.getAttribute("data-list-description")).toContain(
      "Late submissions or feedback changes are accepted until",
    );
    expect(list).toHaveAttribute("data-read-only", "true");
    expect(getFeedbackReviewStatusesMock).toHaveBeenCalledWith(["10", "11"]);
    expect(list.getAttribute("data-feedbacks")).toContain('"reviewSubmitted":true');
    expect(list.getAttribute("data-feedbacks")).toContain('"reviewSubmitted":false');
  });

  it("renders due-only guidance and editable mode for future due dates", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      feedbackDueDate: "2099-04-01T12:00:00.000Z",
      feedbackDueDateMcf: null,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await ProjectPeerFeedbackPage({ params: Promise.resolve({ projectId: "55" }) });
    render(page);

    const list = screen.getByTestId("feedback-list-view");
    expect(list).toHaveAttribute("data-read-only", "false");
    expect(list.getAttribute("data-list-description")).toContain(
      "Please complete your reviews before the deadline.",
    );
  });

  it("falls back to default guidance when deadline lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline unavailable"));

    const page = await ProjectPeerFeedbackPage({ params: Promise.resolve({ projectId: "71" }) });
    render(page);

    const list = screen.getByTestId("feedback-list-view");
    expect(list).toHaveAttribute("data-read-only", "false");
    expect(list.getAttribute("data-list-description")).toBe(
      "Review and respond to feedback items in this list.",
    );
  });

  it("uses default guidance for invalid deadline values", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      feedbackDueDate: "not-a-date",
      feedbackDueDateMcf: "also-not-a-date",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await ProjectPeerFeedbackPage({ params: Promise.resolve({ projectId: "99" }) });
    render(page);

    const list = screen.getByTestId("feedback-list-view");
    expect(list).toHaveAttribute("data-read-only", "false");
    expect(list.getAttribute("data-list-description")).toBe(
      "Review and respond to feedback items in this list.",
    );
  });
});
