import { describe, expect, it } from "vitest";
import type { Question } from "./types";
import {
  formatDateLabel,
  formatRemainingDuration,
  getRatingBounds,
  getSliderConfig,
  getTextConfig,
  isNumericQuestion,
  isQuestionAnswered,
  normalizeAnswers,
  toAnswersArray,
  toDate,
} from "./utils";

function question(overrides: Partial<Question>): Question {
  return {
    id: 1,
    text: "Q",
    type: "text",
    order: 1,
    ...overrides,
  };
}

describe("peerAssessment utils", () => {
  it("converts answer maps to ordered answer arrays", () => {
    const questions = [
      question({ id: 2, type: "text" }),
      question({ id: 3, type: "slider" }),
    ];

    expect(toAnswersArray({ 3: 7, 2: "hello", 99: "ignored" }, questions)).toEqual([
      { question: "2", answer: "hello" },
      { question: "3", answer: 7 },
    ]);
  });

  it("identifies numeric question types", () => {
    expect(isNumericQuestion(question({ type: "rating" }))).toBe(true);
    expect(isNumericQuestion(question({ type: "slider" }))).toBe(true);
    expect(isNumericQuestion(question({ type: "text" }))).toBe(false);
  });

  it("validates answers for numeric, multiple-choice, and text questions", () => {
    expect(isQuestionAnswered(question({ type: "rating" }), 4)).toBe(true);
    expect(isQuestionAnswered(question({ type: "rating" }), Number.NaN)).toBe(false);
    expect(isQuestionAnswered(question({ type: "slider" }), "4")).toBe(false);

    expect(
      isQuestionAnswered(question({ type: "multiple-choice", configs: { options: ["A", "B"] } }), "A"),
    ).toBe(true);
    expect(
      isQuestionAnswered(question({ type: "multiple-choice", configs: { options: ["A", "B"] } }), " C "),
    ).toBe(false);
    expect(isQuestionAnswered(question({ type: "multiple-choice", configs: { options: [] } }), "A")).toBe(false);
    expect(isQuestionAnswered(question({ type: "multiple-choice" }), "")).toBe(false);

    expect(isQuestionAnswered(question({ type: "text" }), "hello")).toBe(true);
    expect(isQuestionAnswered(question({ type: "text" }), "   ")).toBe(false);
  });

  it("derives rating and slider defaults from configs", () => {
    expect(getRatingBounds(question({ type: "rating", configs: { min: 2, max: 8 } }))).toEqual({ min: 2, max: 8 });
    expect(getRatingBounds(question({ type: "rating", configs: { min: 5, max: 1 } }))).toEqual({ min: 5, max: 5 });
    expect(getRatingBounds(question({ type: "rating", configs: {} }))).toEqual({ min: 1, max: 5 });

    expect(
      getSliderConfig(
        question({
          type: "slider",
          configs: {
            min: 10,
            max: 30,
            step: 2,
            left: "Low",
            right: "High",
            helperText: "Move slider",
          },
        }),
      ),
    ).toEqual({
      min: 10,
      max: 30,
      step: 2,
      left: "Low",
      right: "High",
      helperText: "Move slider",
    });

    expect(getSliderConfig(question({ type: "slider", configs: { min: 10, max: 5, step: 0 } }))).toEqual({
      min: 10,
      max: 10,
      step: 1,
      left: undefined,
      right: undefined,
      helperText: undefined,
    });
  });

  it("derives text config min/max and optional labels", () => {
    expect(
      getTextConfig(
        question({
          type: "text",
          configs: { minLength: 5, maxLength: 100, helperText: "h", placeholder: "p" },
        }),
      ),
    ).toEqual({
      helperText: "h",
      placeholder: "p",
      minLength: 5,
      maxLength: 100,
    });

    expect(getTextConfig(question({ type: "text", configs: { minLength: -1, maxLength: -9 } }))).toEqual({
      helperText: undefined,
      placeholder: undefined,
      minLength: undefined,
      maxLength: undefined,
    });
  });

  it("parses and formats date/time helpers", () => {
    expect(toDate(undefined)).toBeNull();
    expect(toDate("")).toBeNull();
    expect(toDate("invalid")).toBeNull();
    expect(toDate("2026-04-12T10:00:00.000Z")).toBeInstanceOf(Date);

    expect(formatDateLabel(null)).toBe("Not set");
    expect(formatDateLabel(new Date("2026-04-12T10:00:00.000Z"))).toContain("2026");
  });

  it("formats remaining duration with clamped lower bound", () => {
    expect(formatRemainingDuration(-5)).toBe("00d : 00h : 00m : 00s");
    expect(formatRemainingDuration(93784)).toBe("01d : 02h : 03m : 04s");
  });

  it("normalizes raw answers by question type", () => {
    const questions = [
      question({ id: 1, type: "rating" }),
      question({ id: 2, type: "slider" }),
      question({ id: 3, type: "text" }),
    ];

    expect(normalizeAnswers(undefined, questions)).toEqual({});
    expect(normalizeAnswers({ 1: 4, 2: "7", 3: true, 999: null }, questions)).toEqual({
      1: 4,
      2: 7,
      3: "true",
      999: "",
    });

    expect(normalizeAnswers({ 1: "not-number", 2: "   " }, questions)).toEqual({
      1: "not-number",
      2: "   ",
    });
  });
});
