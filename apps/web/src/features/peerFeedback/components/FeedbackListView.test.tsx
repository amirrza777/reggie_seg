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

    expect(screen.getAllByText("From: Teammate")).toHaveLength(2);
    expect(screen.queryByText(/Dan Student/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alex User/)).not.toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Review submitted - click to edit")).toBeInTheDocument();
    expect(screen.getByText("Not submitted yet - click to review")).toBeInTheDocument();

    const submittedLink = container.querySelector('a[href="/projects/1/peer-feedback/10"]');
    const pendingLink = container.querySelector('a[href="/projects/1/peer-feedback/11"]');
    expect(submittedLink).toBeTruthy();
    expect(pendingLink).toBeTruthy();
  });

  it("renders optional intro content when title/description are provided", () => {
    render(
      <FeedbackAssessmentView
        feedbacks={[]}
        projectId="1"
        listTitle="Peer feedback"
        listDescription="Review all peer feedback items."
      />
    );
    expect(screen.getByRole("region", { name: "Peer feedback guidance" })).toBeInTheDocument();
    expect(screen.getByText("Peer feedback")).toBeInTheDocument();
    expect(screen.getByText("Review all peer feedback items.")).toBeInTheDocument();
  });

  it("renders intro when only one of title or description is provided", () => {
    const { rerender } = render(
      <FeedbackAssessmentView feedbacks={[]} projectId="1" listTitle="Title only" />
    );
    expect(screen.getByText("Title only")).toBeInTheDocument();
    expect(screen.queryByText("Description only")).not.toBeInTheDocument();

    rerender(
      <FeedbackAssessmentView
        feedbacks={[]}
        projectId="1"
        listDescription="Description only"
      />
    );
    expect(screen.queryByText("Title only")).not.toBeInTheDocument();
    expect(screen.getByText("Description only")).toBeInTheDocument();
  });

  it("uses read-only copy for submitted and pending cards", () => {
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
    render(<FeedbackAssessmentView feedbacks={feedbacks} projectId="1" readOnly />);
    expect(screen.getByText("Review submitted - click to view")).toBeInTheDocument();
    expect(screen.getByText("Submission window closed - click to view")).toBeInTheDocument();
  });
});
