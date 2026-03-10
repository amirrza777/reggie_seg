import { describe, expect, it } from "vitest";
import { mapApiAssessmentToPeerAssessment, mapApiQuestionsToQuestions } from "./mapper";

describe("peerAssessment mapper", () => {
  it("maps and orders valid template questions", () => {
    const raw = {
      questionnaireTemplate: {
        questions: [
          { id: 2, label: "Pick one", type: "multiple-choice", order: 2, configs: { options: ["A", "B"] } },
          { id: 1, label: "Rate contribution", type: "rating", order: 1, configs: { min: 1, max: 5 } },
          { id: 3, label: "", type: "slider", order: 3, configs: { min: 0, max: 100, step: 10 } },
        ],
      },
    };

    const mapped = mapApiQuestionsToQuestions(raw);

    expect(mapped).toEqual([
      expect.objectContaining({ id: 1, text: "Rate contribution", type: "rating", order: 1 }),
      expect.objectContaining({ id: 2, text: "Pick one", type: "multiple-choice", order: 2 }),
    ]);
  });

  it("maps answersJson arrays into answer records", () => {
    const mapped = mapApiAssessmentToPeerAssessment({
      id: 10,
      projectId: 1,
      teamId: 2,
      reviewerUserId: 3,
      revieweeUserId: 4,
      submittedAt: "2026-03-10T00:00:00.000Z",
      templateId: 5,
      answersJson: [
        { question: "1", answer: 4 },
        { questionId: "2", answer: "Strong communicator" },
      ],
      reviewee: { firstName: "A", lastName: "B" },
    });

    expect(mapped.answers).toEqual({
      "1": 4,
      "2": "Strong communicator",
    });
  });
});
