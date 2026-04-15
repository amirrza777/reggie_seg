import { describe, expect, it } from "vitest";
import {
  mapApiAssessmentToPeerAssessment,
  mapApiAssessmentToPeerAssessmentReceived,
  mapApiQuestionsToQuestions,
} from "./mapper";

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

  it("handles raw arrays/questions objects, filters invalid entries, and normalizes types/configs", () => {
    expect(mapApiQuestionsToQuestions(null)).toEqual([]);

    const mappedFromArray = mapApiQuestionsToQuestions([
      null,
      { id: "x", label: "Bad id", type: "rating" },
      { id: 7, label: "   ", type: "slider" },
      {
        id: 11,
        label: "  Availability  ",
        type: " slider ",
        configs: {
          required: true,
          helperText: "help",
          placeholder: "pick",
          minLength: 1,
          maxLength: 10,
          options: [1, "2"],
          min: 0,
          max: 100,
          step: 10,
          left: "low",
          right: "high",
        },
      },
      { id: 12, label: "Comment", type: "unknown", configs: {} },
    ]);

    expect(mappedFromArray).toEqual([
      expect.objectContaining({
        id: 11,
        text: "Availability",
        type: "slider",
        order: 3,
        configs: expect.objectContaining({
          required: true,
          helperText: "help",
          placeholder: "pick",
          options: ["1", "2"],
          left: "low",
          right: "high",
        }),
      }),
      expect.objectContaining({
        id: 12,
        text: "Comment",
        type: "text",
        order: 4,
        configs: undefined,
      }),
    ]);

    const mappedFromQuestionsObject = mapApiQuestionsToQuestions({
      questions: [{ id: 2, label: "Rate", type: "rating", order: 9 }],
    });
    expect(mappedFromQuestionsObject).toEqual([
      expect.objectContaining({ id: 2, text: "Rate", type: "rating", order: 9 }),
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

  it("maps object answers and normalizes non-string answer values", () => {
    const mapped = mapApiAssessmentToPeerAssessment({
      id: 11,
      projectId: 1,
      teamId: 2,
      reviewerUserId: 3,
      revieweeUserId: 4,
      submittedAt: "2026-03-10T00:00:00.000Z",
      templateId: 5,
      answersJson: {
        boolAnswer: true,
        nilAnswer: null,
        objectAnswer: { nested: 1 },
        nonFiniteNumber: Number.POSITIVE_INFINITY,
      },
    });

    expect(mapped.answers).toEqual({
      boolAnswer: true,
      nilAnswer: null,
      objectAnswer: "[object Object]",
      nonFiniteNumber: "Infinity",
    });
    expect(mapped.firstName).toBe("");
    expect(mapped.lastName).toBe("");
  });

  it("ignores answer rows missing a question key", () => {
    const mapped = mapApiAssessmentToPeerAssessment({
      id: 20,
      projectId: 1,
      teamId: 2,
      reviewerUserId: 3,
      revieweeUserId: 4,
      submittedAt: "2026-03-10T00:00:00.000Z",
      templateId: 5,
      answersJson: [{ answer: "skip me" }, { questionId: 9, answer: "keep me" }],
      reviewee: { firstName: "R", lastName: "V" },
    });

    expect(mapped.answers).toEqual({ "9": "keep me" });
  });

  it("maps received assessments using reviewer names with empty-string fallback", () => {
    const withReviewer = mapApiAssessmentToPeerAssessmentReceived({
      id: 30,
      projectId: 1,
      teamId: 2,
      reviewerUserId: 3,
      revieweeUserId: 4,
      submittedAt: "2026-03-10T00:00:00.000Z",
      templateId: 5,
      answersJson: {},
      reviewer: { firstName: "Sam", lastName: "Patel" },
    });

    const withoutReviewer = mapApiAssessmentToPeerAssessmentReceived({
      id: 31,
      projectId: 1,
      teamId: 2,
      reviewerUserId: 3,
      revieweeUserId: 4,
      submittedAt: "2026-03-10T00:00:00.000Z",
      templateId: 5,
      answersJson: null,
    });

    expect(withReviewer.firstName).toBe("Sam");
    expect(withReviewer.lastName).toBe("Patel");
    expect(withoutReviewer.firstName).toBe("");
    expect(withoutReviewer.lastName).toBe("");
  });
});
