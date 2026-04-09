import type { Question } from "./types";

export type AnswerValue = string | number;

export const toAnswersArray = (
  answers: Record<string, AnswerValue>,
  orderedQuestions: Question[]
) =>
  orderedQuestions
    .filter((question) => Object.prototype.hasOwnProperty.call(answers, String(question.id)))
    .map((question) => ({
      question: String(question.id),
      answer: answers[String(question.id)],
    }));

export function isNumericQuestion(question: Question) {
  return question.type === "rating" || question.type === "slider";
}

export function isQuestionAnswered(question: Question, answer: AnswerValue | undefined) {
  if (question.type === "rating" || question.type === "slider") {
    return typeof answer === "number" && Number.isFinite(answer);
  }

  if (question.type === "multiple-choice") {
    if (typeof answer !== "string" || answer.trim().length === 0) return false;
    const options = Array.isArray(question.configs?.options) ? question.configs.options : [];
    if (options.length === 0) return false;
    return options.includes(answer);
  }

  return typeof answer === "string" && answer.trim().length > 0;
}

export function getRatingBounds(question: Question) {
  const min = typeof question.configs?.min === "number" ? question.configs.min : 1;
  const configuredMax =
    typeof question.configs?.max === "number" ? question.configs.max : min + 4;
  const max = configuredMax >= min ? configuredMax : min;
  return { min, max };
}

export function getSliderConfig(question: Question) {
  const min = typeof question.configs?.min === "number" ? question.configs.min : 0;
  const configuredMax =
    typeof question.configs?.max === "number" ? question.configs.max : min + 100;
  const max = configuredMax >= min ? configuredMax : min;
  const step =
    typeof question.configs?.step === "number" && question.configs.step > 0
      ? question.configs.step
      : 1;
  return {
    min,
    max,
    step,
    left: typeof question.configs?.left === "string" ? question.configs.left : undefined,
    right: typeof question.configs?.right === "string" ? question.configs.right : undefined,
    helperText:
      typeof question.configs?.helperText === "string" ? question.configs.helperText : undefined,
  };
}

export function getTextConfig(question: Question) {
  const minLength =
    typeof question.configs?.minLength === "number" && question.configs.minLength >= 0
      ? question.configs.minLength
      : undefined;
  const maxLength =
    typeof question.configs?.maxLength === "number" && question.configs.maxLength >= 0
      ? question.configs.maxLength
      : undefined;

  return {
    helperText:
      typeof question.configs?.helperText === "string" ? question.configs.helperText : undefined,
    placeholder:
      typeof question.configs?.placeholder === "string" ? question.configs.placeholder : undefined,
    minLength,
    maxLength,
  };
}

export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateLabel(value: Date | null): string {
  return value ? value.toLocaleString() : "Not set";
}

export function formatRemainingDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(days)}d : ${two(hours)}h : ${two(minutes)}m : ${two(seconds)}s`;
}

export function normalizeAnswers(
  raw: Record<string, string | number | boolean | null> | undefined,
  questions: Question[]
): Record<string, AnswerValue> {
  if (!raw || typeof raw !== "object") return {};
  const normalized: Record<string, AnswerValue> = {};
  Object.entries(raw).forEach(([k, v]) => {
    const question = questions.find((item) => String(item.id) === k);
    if (question && isNumericQuestion(question)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        normalized[k] = v;
        return;
      }
      if (typeof v === "string" && v.trim().length > 0) {
        const parsed = Number(v);
        if (Number.isFinite(parsed)) {
          normalized[k] = parsed;
          return;
        }
      }
    }
    normalized[k] = String(v ?? "");
  });
  return normalized;
}
