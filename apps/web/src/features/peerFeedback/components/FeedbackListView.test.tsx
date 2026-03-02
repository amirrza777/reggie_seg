import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedbackAssessmentView } from "./FeedbackListView";
import type { PeerFeedback } from "../types";

describe("FeedbackAssessmentView", () => {
  it("renders empty-state message when no feedback exists", () => {
    render(<FeedbackAssessmentView feedbacks={[]} projectId="1" />);
    expect(screen.getByText("No feedbacks submitted yet.")).toBeInTheDocument();
  });

  it("renders feedback cards with submitted and pending status", () => {
    const feedbacks: PeerFeedback[] = [
      {
        id: "10",
        projectId: "1",
        reviewerId: "4",
        revieweeId: "2",
        submittedAt: "2026-03-01T12:00:00.000Z",
        answers: [],
        firstName: "Dan",
        lastName: "Student",
        reviewSubmitted: true,
      },
      {
        id: "11",
        projectId: "1",
        reviewerId: "4",
        revieweeId: "3",
        submittedAt: "2026-03-01T13:00:00.000Z",
        answers: [],
        firstName: "Alex",
        lastName: "User",
        reviewSubmitted: false,
      },
    ];

    const { container } = render(<FeedbackAssessmentView feedbacks={feedbacks} projectId="1" />);

    expect(screen.getByText("From: Dan Student")).toBeInTheDocument();
    expect(screen.getByText("From: Alex User")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Review submitted - click to edit →")).toBeInTheDocument();
    expect(screen.getByText("Not submitted yet - click to review →")).toBeInTheDocument();

    const submittedLink = container.querySelector('a[href="/projects/1/peer-feedback/10"]');
    const pendingLink = container.querySelector('a[href="/projects/1/peer-feedback/11"]');
    expect(submittedLink).toBeTruthy();
    expect(pendingLink).toBeTruthy();
  });
});
