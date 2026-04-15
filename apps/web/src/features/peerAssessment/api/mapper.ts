/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PeerAssessment, Question, QuestionConfigs, QuestionType } from "../types";

function normalizeAnswerValue(value: unknown): string | number | boolean | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (value == null) return null;
  return String(value);
}

function normalizeQuestionType(type: unknown): QuestionType {
  const normalized = String(type)
    .trim()
    .toLowerCase();

  if (normalized === "multiple-choice") return "multiple-choice";
  if (normalized === "rating") return "rating";
  if (normalized === "slider") return "slider";
  return "text";
}

function normalizeQuestionConfigs(configs: any): QuestionConfigs | undefined {
  if (!configs || typeof configs !== "object") return undefined;

  const normalized: QuestionConfigs = {
    required: typeof configs.required === "boolean" ? configs.required : undefined,
    helperText: typeof configs.helperText === "string" ? configs.helperText : undefined,
    placeholder: typeof configs.placeholder === "string" ? configs.placeholder : undefined,
    minLength: typeof configs.minLength === "number" ? configs.minLength : undefined,
    maxLength: typeof configs.maxLength === "number" ? configs.maxLength : undefined,
    options: Array.isArray(configs.options) ? configs.options.map(String) : undefined,
    min: typeof configs.min === "number" ? configs.min : undefined,
    max: typeof configs.max === "number" ? configs.max : undefined,
    step: typeof configs.step === "number" ? configs.step : undefined,
    left: typeof configs.left === "string" ? configs.left : undefined,
    right: typeof configs.right === "string" ? configs.right : undefined,
  };

  const hasAnyConfig = Object.values(normalized).some((value) => value !== undefined);
  return hasAnyConfig ? normalized : undefined;
}

function extractQuestionArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.questions)) return raw.questions;
  if (raw && raw.questionnaireTemplate && Array.isArray(raw.questionnaireTemplate.questions)) {
    return raw.questionnaireTemplate.questions;
  }
  return [];
}

export function mapApiQuestionsToQuestions(raw: any): Question[] {
  const questions = extractQuestionArray(raw);
  return questions
    .map((q: any, idx: number) => {
      if (!q || typeof q !== "object") return null;

      const id = Number(q.id);
      if (!Number.isFinite(id)) return null;

      const label = typeof q.label === "string" ? q.label.trim() : "";
      if (!label) return null;

      const order = typeof q.order === "number" ? q.order : idx;
      const configs = normalizeQuestionConfigs(q.configs);

      return {
        id,
        text: label,
        type: normalizeQuestionType(q.type),
        order,
        configs,
      } as Question;
    })
    .filter((q): q is Question => q !== null)
    .sort((a, b) => a.order - b.order);
}

export function mapApiAssessmentToPeerAssessment(raw: any): PeerAssessment {
  // Convert answers array to Record if needed
  const answers: Record<string, string | number | boolean | null> = {};
  if (Array.isArray(raw.answersJson)) {
    raw.answersJson.forEach((item: any) => {
      const key = item.question ?? item.questionId;
      if (key == null) return;
      answers[String(key)] = normalizeAnswerValue(item.answer);
    });
  } else if (typeof raw.answersJson === "object" && raw.answersJson !== null) {
    Object.entries(raw.answersJson).forEach(([k, v]) => {
      answers[k] = normalizeAnswerValue(v);
    });
  }

  const templateQuestions =
    raw.questionnaireTemplate != null
      ? mapApiQuestionsToQuestions(raw.questionnaireTemplate)
      : [];

  return {
    id: String(raw.id),
    projectId: raw.projectId,
    teamId: raw.teamId,
    reviewerUserId: raw.reviewerUserId,
    revieweeUserId: raw.revieweeUserId,
    submittedAt: raw.submittedAt,
    templateId: raw.templateId,
    answers,
    templateQuestions,
    firstName: raw.reviewee?.firstName ?? "",
    lastName: raw.reviewee?.lastName ?? "",
  };
}

/** assessments received by the current user */
export function mapApiAssessmentToPeerAssessmentReceived(raw: any): PeerAssessment {
  const base = mapApiAssessmentToPeerAssessment(raw);
  return {
    ...base,
    firstName: raw.reviewer?.firstName ?? "",
    lastName: raw.reviewer?.lastName ?? "",
  };
}
