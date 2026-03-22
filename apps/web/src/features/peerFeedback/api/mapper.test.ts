import { describe, expect, it } from "vitest";
import { mapApiAssessmentToPeerFeedback, mapApiAssessmentsToPeerFeedbacks } from "./mapper";

describe("peerFeedback mapper", () => {
  it("maps template question metadata into answer previews", () => {
    const mapped = mapApiAssessmentToPeerFeedback({
      id: 21,
      projectId: 4,
      reviewerUserId: 8,
      revieweeUserId: 10,
      submittedAt: "2026-03-10T00:00:00.000Z",
      templateId: 12,
      answersJson: [
        { question: "5", answer: "Yes" },
        { question: "7", answer: 4 },
      ],
      questionnaireTemplate: {
        id: 12,
        questions: [
          { id: 5, label: "Did they contribute?", type: "multiple-choice", order: 1, configs: { options: ["Yes", "No"] } },
          { id: 7, label: "How many", type: "rating", order: 2, configs: { min: 1, max: 5 } },
        ],
      },
      reviewee: { firstName: "Monika", lastName: "Konig" },
    });

    expect(mapped.templateId).toBe(12);
    expect(mapped.answers).toEqual([
      expect.objectContaining({
        id: "5",
        questionId: "5",
        question: "Did they contribute?",
        type: "multiple-choice",
        answer: "Yes",
      }),
      expect.objectContaining({
        id: "7",
        questionId: "7",
        question: "How many",
        type: "rating",
        answer: 4,
      }),
    ]);
  });

  it("maps assessment lists into feedback array", () => {
    const mapped = mapApiAssessmentsToPeerFeedbacks([
      {
        id: 1,
        projectId: 2,
        reviewerUserId: 3,
        revieweeUserId: 4,
        submittedAt: "2026-03-10T00:00:00.000Z",
        answersJson: [{ question: "10", answer: "value" }],
      },
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe("1");
    expect(mapped[0].answers[0]).toEqual(
      expect.objectContaining({
        id: "10",
        questionId: "10",
        question: "10",
        type: "text",
        answer: "value",
      })
    );
  });
});
