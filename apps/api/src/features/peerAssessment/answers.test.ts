import { describe, expect, it } from "vitest";
import { normalizeAndValidateAssessmentAnswers } from "./answers.js";

const templateQuestions = [
  { id: 1, type: "text" },
  { id: 2, type: "multiple-choice", configs: { options: ["Excellent", "Needs work"] } },
  { id: 3, type: "rating", configs: { min: 1, max: 5 } },
  { id: 4, type: "slider", configs: { min: 0, max: 100, step: 5 } },
];

describe("normalizeAndValidateAssessmentAnswers", () => {
  it("normalizes object payloads and coerces numeric question answers", () => {
    const normalized = normalizeAndValidateAssessmentAnswers(
      {
        1: "Great communicator",
        2: "Excellent",
        3: "4",
        4: 85,
      },
      templateQuestions
    );

    expect(normalized).toEqual([
      { question: "1", answer: "Great communicator" },
      { question: "2", answer: "Excellent" },
      { question: "3", answer: 4 },
      { question: "4", answer: 85 },
    ]);
  });

  it("accepts array payloads with questionId", () => {
    const normalized = normalizeAndValidateAssessmentAnswers(
      [
        { questionId: 1, answer: "Solid contribution" },
        { questionId: 3, answer: 5 },
      ],
      templateQuestions
    );

    expect(normalized).toEqual([
      { question: "1", answer: "Solid contribution" },
      { question: "3", answer: 5 },
    ]);
  });

  it("throws for question IDs not in the template", () => {
    expect(() =>
      normalizeAndValidateAssessmentAnswers([{ question: "99", answer: "x" }], templateQuestions)
    ).toThrow("Question 99 is not part of the questionnaire template.");
  });

  it("throws for invalid multiple-choice options", () => {
    expect(() =>
      normalizeAndValidateAssessmentAnswers([{ question: "2", answer: "Maybe" }], templateQuestions)
    ).toThrow("Question 2 answer is not one of the configured options.");
  });

  it("throws for slider answers not aligned to step", () => {
    expect(() =>
      normalizeAndValidateAssessmentAnswers([{ question: "4", answer: 83 }], templateQuestions)
    ).toThrow("Question 4 answer must align with slider step 5.");
  });
});
