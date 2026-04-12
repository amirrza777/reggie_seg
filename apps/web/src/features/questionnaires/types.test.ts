import { describe, expect, it } from "vitest";
import { QUESTIONNAIRE_PURPOSE_VALUES } from "./types";
import type * as questionnaireTypes from "./types";

describe("questionnaires/types", () => {
  it("exports QUESTIONNAIRE_PURPOSE_VALUES constant with correct values", () => {
    expect(QUESTIONNAIRE_PURPOSE_VALUES).toContain("PEER_ASSESSMENT");
    expect(QUESTIONNAIRE_PURPOSE_VALUES).toContain("CUSTOMISED_ALLOCATION");
    expect(QUESTIONNAIRE_PURPOSE_VALUES).toContain("GENERAL_PURPOSE");
    expect(QUESTIONNAIRE_PURPOSE_VALUES).toHaveLength(3);
  });

  it("exports EditableQuestion type", () => {
    const testValue: questionnaireTypes.EditableQuestion = {
      questionText: "Test?",
      type: "SHORT_TEXT",
      uiId: 1,
    };
    expect(testValue.questionText).toBe("Test?");
    expect(testValue.type).toBe("SHORT_TEXT");
    expect(testValue.uiId).toBe(1);
  });

  it("supports EditableQuestion with dbId", () => {
    const testValue: questionnaireTypes.EditableQuestion = {
      questionText: "Test?",
      type: "SHORT_TEXT",
      uiId: 1,
      dbId: 123,
    };
    expect(testValue.dbId).toBe(123);
  });

  it("supports EditableQuestion with id", () => {
    const testValue: questionnaireTypes.EditableQuestion = {
      questionText: "Test?",
      type: "SHORT_TEXT",
      uiId: 1,
      id: 456,
    };
    expect(testValue.id).toBe(456);
  });

  it("supports EditableQuestion with question configs", () => {
    const testValue: questionnaireTypes.EditableQuestion = {
      questionText: "Rate this?",
      type: "RATING",
      uiId: 1,
      configs: {
        scaleMin: 1,
        scaleMax: 5,
        scaleLabels: ["Low", "High"],
      },
    };
    expect(testValue.type).toBe("RATING");
  });

  it("supports EditableQuestion with optional configs", () => {
    const testValue: questionnaireTypes.EditableQuestion = {
      questionText: "Select one?",
      type: "MULTIPLE_CHOICE",
      uiId: 2,
    };
    // configs is optional
    expect(testValue.configs).toBeUndefined();
  });
});
