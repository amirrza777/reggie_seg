import { describe, expect, it } from "vitest";
import { buildPerformanceSummary } from "./service.performanceSummary.js";

describe("peerAssessment performance summary", () => {
  it("returns an empty summary when there are no assessments", () => {
    const result = buildPerformanceSummary(
      [],
      [{ id: 10, label: "Quality", order: 1, type: "score", configs: { max: 7 } }],
    );

    expect(result).toEqual({
      overallAverage: 0,
      totalReviews: 0,
      questionAverages: [],
      maxScore: 7,
    });
  });

  it("builds reviewer/question averages from array answer payloads", () => {
    const result = buildPerformanceSummary(
      [
        {
          id: 1,
          reviewerUserId: 100,
          templateId: 9,
          reviewer: { id: 100, firstName: "Ayan", lastName: "Mamun" },
          answersJson: [
            { question: 11, answer: "4.5" },
            { questionId: 12, answer: 3 },
          ],
        },
        {
          id: 2,
          reviewerUserId: 101,
          templateId: 9,
          reviewer: { id: 101, firstName: "", lastName: "" },
          answersJson: [
            { id: 11, answer: 5 },
            { question: 12, answer: "bad" },
          ],
        },
      ],
      [
        { id: 11, label: "Quality", order: 1, type: "score", configs: { max: 8 } },
        { id: 12, label: "Delivery", order: 2, type: "score", configs: null },
      ],
    );

    expect(result.maxScore).toBe(8);
    expect(result.overallAverage).toBe(4.17);
    expect(result.totalReviews).toBe(2);
    expect(result.questionAverages).toHaveLength(2);
    expect(result.questionAverages[0]).toEqual(
      expect.objectContaining({
        questionId: 11,
        averageScore: 4.75,
        maxScore: 8,
        totalReviews: 2,
      }),
    );
    expect(result.questionAverages[1]).toEqual(
      expect.objectContaining({
        questionId: 12,
        averageScore: 3,
        maxScore: 5,
        totalReviews: 1,
      }),
    );
    expect(result.questionAverages[0]?.reviewerAnswers[1]).toEqual(
      expect.objectContaining({ reviewerName: "Reviewer 101" }),
    );
  });

  it("supports object answer payloads and skips non-numeric values", () => {
    const result = buildPerformanceSummary(
      [
        {
          id: 3,
          reviewerUserId: 102,
          templateId: 9,
          reviewer: { id: 102, firstName: "Nora", lastName: "Li" },
          answersJson: { "21": "2.5", 22: "oops" },
        },
      ],
      [
        { id: 21, label: "Participation", order: 1, type: "score", configs: { max: 6 } },
        { id: 22, label: "Communication", order: 2, type: "score", configs: 123 as unknown as null },
      ],
    );

    expect(result.questionAverages).toEqual([
      expect.objectContaining({
        questionId: 21,
        averageScore: 2.5,
        totalReviews: 1,
      }),
    ]);
    expect(result.overallAverage).toBe(2.5);
    expect(result.maxScore).toBe(6);
  });
});
