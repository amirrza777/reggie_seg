type TemplateQuestion = {
  id: number;
  type: string;
  configs?: unknown;
};

type PrimitiveAnswer = string | number | boolean | null;

export type NormalizedAnswer = {
  question: string;
  answer: PrimitiveAnswer;
};

export class AssessmentAnswerValidationError extends Error {}

function normalizeQuestionType(type: unknown): "text" | "multiple-choice" | "rating" | "slider" {
  const normalized = String(type ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "multiple-choice" ||
    normalized === "multiple_choice" ||
    normalized === "multiple choice" ||
    normalized === "mcq"
  ) {
    return "multiple-choice";
  }
  if (normalized === "rating" || normalized === "likert") return "rating";
  if (normalized === "slider" || normalized === "range") return "slider";
  return "text";
}

function toPrimitiveAnswer(value: unknown): PrimitiveAnswer {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new AssessmentAnswerValidationError("Answer values must be string, number, boolean, or null.");
}

function parseIncomingAnswers(payload: unknown): NormalizedAnswer[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => {
      if (!item || typeof item !== "object") {
        throw new AssessmentAnswerValidationError("Each answer item must be an object.");
      }
      const questionKey = (item as { question?: unknown; questionId?: unknown }).question
        ?? (item as { question?: unknown; questionId?: unknown }).questionId;
      const question = String(questionKey ?? "").trim();
      if (!question) {
        throw new AssessmentAnswerValidationError("Each answer item must include a question identifier.");
      }
      const answer = toPrimitiveAnswer((item as { answer?: unknown }).answer ?? null);
      return { question, answer };
    });
  }

  if (payload && typeof payload === "object") {
    return Object.entries(payload as Record<string, unknown>).map(([question, value]) => {
      const key = String(question).trim();
      if (!key) {
        throw new AssessmentAnswerValidationError("Answer map contains an empty question identifier.");
      }
      return {
        question: key,
        answer: toPrimitiveAnswer(value),
      };
    });
  }

  throw new AssessmentAnswerValidationError("answersJson must be an object map or an array of answers.");
}

function toNumber(value: PrimitiveAnswer): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getNumberConfig(configs: unknown, key: "min" | "max" | "step", fallback: number): number {
  if (!configs || typeof configs !== "object") return fallback;
  const value = (configs as Record<string, unknown>)[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function getMultipleChoiceOptions(configs: unknown): string[] {
  if (!configs || typeof configs !== "object") return [];
  const options = (configs as Record<string, unknown>).options;
  if (!Array.isArray(options)) return [];
  return options.map(String);
}

export function normalizeAndValidateAssessmentAnswers(
  payload: unknown,
  templateQuestions: TemplateQuestion[]
): NormalizedAnswer[] {
  const incomingAnswers = parseIncomingAnswers(payload);
  const questionById = new Map<string, TemplateQuestion>(
    templateQuestions.map((question) => [String(question.id), question])
  );

  return incomingAnswers.map(({ question, answer }) => {
    const templateQuestion = questionById.get(question);
    if (!templateQuestion) {
      throw new AssessmentAnswerValidationError(`Question ${question} is not part of the questionnaire template.`);
    }

    const questionType = normalizeQuestionType(templateQuestion.type);
    if (answer == null || answer === "") {
      return { question, answer: null };
    }

    if (questionType === "text") {
      return { question, answer: String(answer) };
    }

    if (questionType === "multiple-choice") {
      const normalizedAnswer = String(answer);
      const options = getMultipleChoiceOptions(templateQuestion.configs);
      if (options.length > 0 && !options.includes(normalizedAnswer)) {
        throw new AssessmentAnswerValidationError(`Question ${question} answer is not one of the configured options.`);
      }
      return { question, answer: normalizedAnswer };
    }

    const numericValue = toNumber(answer);
    if (numericValue == null) {
      throw new AssessmentAnswerValidationError(`Question ${question} requires a numeric answer.`);
    }

    const min = getNumberConfig(templateQuestion.configs, "min", questionType === "slider" ? 0 : 1);
    const max = getNumberConfig(templateQuestion.configs, "max", questionType === "slider" ? min + 100 : min + 4);
    if (numericValue < min || numericValue > max) {
      throw new AssessmentAnswerValidationError(`Question ${question} answer must be between ${min} and ${max}.`);
    }

    if (questionType === "slider") {
      const step = getNumberConfig(templateQuestion.configs, "step", 1);
      if (step > 0) {
        const stepsFromMin = (numericValue - min) / step;
        const isAlignedToStep = Math.abs(stepsFromMin - Math.round(stepsFromMin)) < 1e-9;
        if (!isAlignedToStep) {
          throw new AssessmentAnswerValidationError(`Question ${question} answer must align with slider step ${step}.`);
        }
      }
    }

    return { question, answer: numericValue };
  });
}
