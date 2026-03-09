/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Question , PeerAssessment} from "../types";

function normalizeAnswerValue(value: unknown): string | number | boolean | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" || typeof value === "boolean") return value;
    if (value == null) return null;
    return String(value);
}

export function mapApiQuestionsToQuestions(raw: any): Question[] {
    let arr: any[] = [];

    if (Array.isArray(raw)) {
        arr = raw;
    } else if (Array.isArray(raw.questions)) {
        arr = raw.questions;
    } else if (Array.isArray(raw.questionnaireTemplate?.questions)) {
        arr = raw.questionnaireTemplate.questions;
    }
    return arr.map((q: any, idx: number) => {
    const id = q.id;
    const text = String(q.label);
    const type =q.type;
    const configs = q.configs ?? undefined;
    const mappedConfigs = configs
      ? {
          options: Array.isArray(configs.options) ? configs.options.map(String) : undefined,
          min: typeof configs.min === "number" ? configs.min : undefined,
          max: typeof configs.max === "number" ? configs.max : undefined,
          step: typeof configs.step === "number" ? configs.step : undefined,
          left: typeof configs.left === "string" ? configs.left : undefined,
          right: typeof configs.right === "string" ? configs.right : undefined,
          helperText: typeof configs.helperText === "string" ? configs.helperText : undefined,
        }
      : undefined;

    return {
      id,
      text,
      type,
      order: typeof q.order === "number" ? q.order : idx,
      configs: mappedConfigs,
    } as Question;
  });
}

export function mapApiAssessmentToPeerAssessment(raw: any) : PeerAssessment {
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

    return {   
    id: String(raw.id),
    projectId: raw.projectId,
    teamId: raw.teamId,
    reviewerUserId: raw.reviewerUserId,
    revieweeUserId: raw.revieweeUserId,
    submittedAt: raw.submittedAt,
    templateId: raw.templateId,
    answers,
    firstName: raw.reviewee?.firstName ?? "",
    lastName: raw.reviewee?.lastName ?? "",
  }
}