import { describe, expect, it } from "vitest";
import {
  mapApiAssessmentToPeerFeedback,
  mapApiAssessmentToPeerFeedbackReceived,
  mapApiAssessmentsToPeerFeedbacks,
  mapApiAssessmentsToPeerFeedbacksReceived,
} from "./mapper";

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

  it("maps empty raw payload to safe defaults", () => {
    const mapped = mapApiAssessmentToPeerFeedback(null);
    expect(mapped).toEqual({
      id: "",
      reviewerId: "",
      revieweeId: "",
      submittedAt: "",
      answers: [],
    });
  });

  it("maps answer records and normalizes answer value types", () => {
    const mapped = mapApiAssessmentToPeerFeedback({
      id: 7,
      projectId: 3,
      reviewerUserId: 1,
      revieweeUserId: 2,
      updatedAt: "2026-04-01T10:00:00.000Z",
      answersJson: {
        q1: 4,
        q2: true,
        q3: null,
        q4: { nested: "x" },
      },
      questionnaireTemplate: {
        questions: [
          {
            id: "q1",
            label: "Rate contribution",
            type: "rating",
            order: 1,
            configs: { min: 1, max: 5 },
          },
          {
            id: "q2",
            label: "Worked well together",
            type: "multiple-choice",
            order: 2,
            configs: { options: ["Yes", "No"] },
          },
          {
            id: "q3",
            label: "Extra notes",
            type: "slider",
            order: 3,
            configs: { step: 1, left: "low", right: "high" },
          },
          {
            id: "q4",
            label: "Unknown type",
            type: "something-else",
            order: 4,
            configs: { required: true, helperText: "h", placeholder: "p", minLength: 1, maxLength: 20 },
          },
        ],
      },
    });

    expect(mapped.submittedAt).toBe("2026-04-01T10:00:00.000Z");
    expect(mapped.answers).toEqual([
      expect.objectContaining({ questionId: "q1", type: "rating", answer: 4 }),
      expect.objectContaining({ questionId: "q2", type: "multiple-choice", answer: true }),
      expect.objectContaining({ questionId: "q3", type: "slider", answer: null }),
      expect.objectContaining({ questionId: "q4", type: "text", answer: "[object Object]" }),
    ]);
  });

  it("ignores invalid question metadata and invalid answer entries", () => {
    const mapped = mapApiAssessmentToPeerFeedback({
      id: 9,
      reviewerUserId: 3,
      revieweeUserId: 4,
      submittedAt: "2026-04-02T10:00:00.000Z",
      answersJson: [{}, null, { question: "", answer: "x" }, { questionId: "11", answer: "ok" }],
      questionnaireTemplate: {
        id: 99,
        questions: [
          null,
          { id: "", label: "No id" },
          { id: "11", label: "Prompt", order: 5, type: "text", configs: "bad" },
        ],
      },
    });

    expect(mapped.templateId).toBe(99);
    expect(mapped.answers).toEqual([
      expect.objectContaining({
        questionId: "11",
        question: "Prompt",
        order: 5,
      }),
    ]);
  });

  it("maps templateId from nested peerAssessment template when top-level is absent", () => {
    const mapped = mapApiAssessmentToPeerFeedback({
      id: 12,
      submittedAt: "2026-04-02T00:00:00.000Z",
      peerAssessment: {
        reviewerUserId: 10,
        revieweeUserId: 11,
        questionnaireTemplate: {
          id: 444,
          questions: [],
        },
        answersJson: [],
        reviewee: { firstName: "A", lastName: "B" },
      },
    });

    expect(mapped.templateId).toBe(444);
    expect(mapped.firstName).toBe("A");
    expect(mapped.lastName).toBe("B");
  });

  it("maps received feedback using reviewer names", () => {
    const mapped = mapApiAssessmentToPeerFeedbackReceived({
      id: 14,
      reviewerUserId: 22,
      revieweeUserId: 23,
      submittedAt: "2026-04-03T00:00:00.000Z",
      answersJson: [],
      reviewer: { firstName: "Rev", lastName: "Iewer" },
      reviewee: { firstName: "Ignored", lastName: "Name" },
    });

    expect(mapped.firstName).toBe("Rev");
    expect(mapped.lastName).toBe("Iewer");
  });

  it("maps list wrapper variants and single fallbacks for sent and received collections", () => {
    const sentFromData = mapApiAssessmentsToPeerFeedbacks({
      data: [{ id: 1, reviewerUserId: 2, revieweeUserId: 3, answersJson: [] }],
    });
    expect(sentFromData).toHaveLength(1);

    const sentFromFeedbacks = mapApiAssessmentsToPeerFeedbacks({
      feedbacks: [{ id: 2, reviewerUserId: 2, revieweeUserId: 3, answersJson: [] }],
    });
    expect(sentFromFeedbacks).toHaveLength(1);

    const sentSingle = mapApiAssessmentsToPeerFeedbacks({
      id: 3,
      reviewerUserId: 2,
      revieweeUserId: 3,
      answersJson: [],
    });
    expect(sentSingle).toHaveLength(1);

    const receivedFromData = mapApiAssessmentsToPeerFeedbacksReceived({
      data: [{ id: 4, reviewerUserId: 2, revieweeUserId: 3, answersJson: [] }],
    });
    expect(receivedFromData).toHaveLength(1);

    const receivedFromFeedbacks = mapApiAssessmentsToPeerFeedbacksReceived({
      feedbacks: [{ id: 5, reviewerUserId: 2, revieweeUserId: 3, answersJson: [] }],
    });
    expect(receivedFromFeedbacks).toHaveLength(1);

    const receivedSingle = mapApiAssessmentsToPeerFeedbacksReceived({
      id: 6,
      reviewerUserId: 2,
      revieweeUserId: 3,
      answersJson: [],
    });
    expect(receivedSingle).toHaveLength(1);
  });

  it("returns empty arrays for null list payloads", () => {
    expect(mapApiAssessmentsToPeerFeedbacks(null)).toEqual([]);
    expect(mapApiAssessmentsToPeerFeedbacksReceived(null)).toEqual([]);
  });

  it("returns an empty answers array when answersJson is not an array or object", () => {
    const mapped = mapApiAssessmentToPeerFeedback({
      id: 30,
      reviewerUserId: 1,
      revieweeUserId: 2,
      answersJson: 123,
    });

    expect(mapped.answers).toEqual([]);
  });
});
