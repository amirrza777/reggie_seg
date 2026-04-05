export const DAY_MS = 24 * 60 * 60 * 1000;
export const SCENARIO_PROJECT_NAME = "Completed Demo Project";
export const SCENARIO_TEAM_NAME = "Completed Demo Team";

export type ScenarioQuestion = {
  id: number;
  label: string;
  type: string;
  order: number;
  configs: unknown | null;
};

export function buildReviewPairKey(reviewerId: number, revieweeId: number) {
  return `${reviewerId}:${revieweeId}`;
}

export function buildFeedbackText(reviewerId: number, revieweeId: number) {
  return `Reviewer ${reviewerId} noted that teammate ${revieweeId} maintained steady contributions, met deadlines, and supported team delivery.`;
}

export function buildAgreementPayload(reviewerId: number, revieweeId: number, questionLabels?: string[]) {
  void reviewerId;
  void revieweeId;
  const keys =
    Array.isArray(questionLabels) && questionLabels.length > 0
      ? questionLabels
      : ["communication", "contributionVisible", "wouldWorkAgain", "followUpNeeded"];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        selected: "Reasonable",
        score: 3,
      },
    ])
  );
}

export function buildScenarioAnswer(question: ScenarioQuestion, reviewerId: number, revieweeId: number, index: number): unknown {
  const type = question.type.trim().toLowerCase();
  if (type === "slider" || type === "rating") return buildSliderAnswer(question.configs, reviewerId, revieweeId, index);
  if (type === "multiple-choice" || type === "multiple_choice") {
    return buildMultipleChoiceAnswer(question.configs, reviewerId, revieweeId, index);
  }
  return getTextSeedAnswer(question.label, reviewerId);
}

function buildSliderAnswer(configs: unknown, reviewerId: number, revieweeId: number, index: number) {
  const min = getNumberConfig(configs, "min", 0);
  const max = getNumberConfig(configs, "max", 10);
  const step = Math.max(0.1, getNumberConfig(configs, "step", 1));
  const range = Math.max(step, max - min);
  const ratio = (((reviewerId + revieweeId + index) % 5) + 1) / 5;
  const raw = min + range * ratio;
  const snapped = Math.round(raw / step) * step;
  return Math.max(min, Math.min(max, Number(snapped.toFixed(2))));
}

function buildMultipleChoiceAnswer(configs: unknown, reviewerId: number, revieweeId: number, index: number) {
  const options = getOptionsConfig(configs);
  if (options.length > 0) return options[(reviewerId + revieweeId + index) % options.length];
  const fallbackOptions = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
  return fallbackOptions[(reviewerId + revieweeId + index) % fallbackOptions.length];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getNumberConfig(configs: unknown, key: "min" | "max" | "step", fallback: number): number {
  const row = asRecord(configs);
  if (!row) return fallback;
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getOptionsConfig(configs: unknown): string[] {
  const row = asRecord(configs);
  if (!row || !Array.isArray(row.options)) return [];
  return row.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0);
}

function getTextSeedAnswer(label: string, reviewerId: number): string {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes("technical")) {
    return reviewerId % 2 === 0
      ? "Strong technical implementation and dependable code quality."
      : "Good technical foundation and consistent contribution across tasks.";
  }
  if (normalizedLabel.includes("communication")) {
    return reviewerId % 2 === 0
      ? "Communicated blockers early and kept teammates aligned."
      : "Communication was clear with timely updates during each sprint.";
  }
  if (normalizedLabel.includes("teamwork")) {
    return reviewerId % 2 === 0
      ? "Collaborated well and supported teammates throughout delivery."
      : "Worked effectively with the team and helped unblock others.";
  }
  return "Consistently contributed and collaborated during the project lifecycle.";
}
