import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformanceSummaryCard } from "./PerformanceSummaryCard";

describe("PerformanceSummaryCard", () => {
  it("shows no-numeric fallback when all questions have zero reviews", () => {
    render(
      <PerformanceSummaryCard
        title="Performance"
        data={{
          overallAverage: 0,
          totalReviews: 1,
          maxScore: 5,
          questionAverages: [
            {
              questionId: 1,
              questionText: "Quality",
              averageScore: 0,
              totalReviews: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Based on 1 review.")).toBeInTheDocument();
    expect(screen.getByText(/No numeric rating answers were found/i)).toBeInTheDocument();
  });

  it("renders score details and toggles reviewer answers", () => {
    render(
      <PerformanceSummaryCard
        title="Performance"
        data={{
          overallAverage: 4.3,
          totalReviews: 3,
          maxScore: 5,
          questionAverages: [
            {
              questionId: 101,
              questionText: "Quality",
              averageScore: 4.5,
              totalReviews: 3,
              reviewerAnswers: [
                { reviewerId: "r1", reviewerName: "Alice Reviewer", score: 5 },
                { reviewerId: "r2", reviewerName: "Bob Reviewer", score: 4 },
              ],
            },
            {
              questionId: 102,
              questionText: "No detail question",
              averageScore: 3,
              totalReviews: 2,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Overall Average")).toBeInTheDocument();
    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("Based on 3 reviews")).toBeInTheDocument();

    expect(screen.queryByText("Alice Reviewer")).not.toBeInTheDocument();

    const qualityTrigger = screen.getByText("Quality").closest(".performance-summary__question-trigger");
    expect(qualityTrigger).not.toBeNull();
    fireEvent.click(qualityTrigger!);

    expect(screen.getByText("Alice Reviewer")).toBeInTheDocument();
    expect(screen.getByText("Bob Reviewer")).toBeInTheDocument();

    fireEvent.click(qualityTrigger!);
    expect(screen.queryByText("Alice Reviewer")).not.toBeInTheDocument();

    const noDetailTrigger = screen.getByText("No detail question").closest(".performance-summary__question-trigger");
    expect(noDetailTrigger?.className).toContain("is-static");
    fireEvent.click(noDetailTrigger!);
    expect(screen.queryByText("No detail question")).toBeInTheDocument();
  });
});
