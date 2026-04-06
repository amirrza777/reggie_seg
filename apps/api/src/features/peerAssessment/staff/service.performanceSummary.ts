import type { PerformanceSummary, QuestionAverage, ReviewerAnswer } from "./types.js";

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseScoreForQuestion(answersJson: unknown, questionId: number): number | null {
  if (Array.isArray(answersJson)) {
    const match = answersJson.find((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      const q = row.question ?? row.questionId ?? row.id;
      return String(q) === String(questionId);
    });
    if (!match || typeof match !== "object") return null;
    const answer = (match as Record<string, unknown>).answer;
    return parseScore(answer);
  }

  if (answersJson && typeof answersJson === "object") {
    const row = answersJson as Record<string, unknown>;
    return parseScore(row[questionId] ?? row[String(questionId)]);
  }

  return null;
}

function getConfiguredMaxScore(configs: unknown): number | null {
  if (!configs || typeof configs !== "object") return null;
  const row = configs as Record<string, unknown>;
  const max = row.max;
  return typeof max === "number" && Number.isFinite(max) && max > 0 ? max : null;
}

export function buildPerformanceSummary(
  assessments: Array<{
    id: number;
    reviewerUserId: number;
    answersJson: unknown;
    templateId: number;
    reviewer: { id: number; firstName: string; lastName: string };
  }>,
  questions: Array<{ id: number; label: string; order: number; type: string; configs: unknown | null }>,
): PerformanceSummary {
  const maxScore = questions.reduce((acc, q) => {
    const configured = getConfiguredMaxScore(q.configs);
    return Math.max(acc, configured ?? 5);
  }, 5);

  if (assessments.length === 0 || questions.length === 0) {
    return { overallAverage: 0, totalReviews: assessments.length, questionAverages: [], maxScore };
  }
  const questionAverages: QuestionAverage[] = [];
  for (const q of questions) {
    const questionMaxScore = getConfiguredMaxScore(q.configs) ?? 5;
    const reviewerAnswers: ReviewerAnswer[] = [];
    let sum = 0;

    for (const a of assessments) {
      const score = parseScoreForQuestion(a.answersJson, q.id);
      if (score != null) {
        sum += score;
        reviewerAnswers.push({
          reviewerId: String(a.reviewerUserId),
          reviewerName: `${a.reviewer.firstName} ${a.reviewer.lastName}`.trim() || `Reviewer ${a.reviewerUserId}`,
          score,
          assessmentId: String(a.id),
        });
      }
    }

    const totalReviews = reviewerAnswers.length;
    if (totalReviews === 0) {
      continue;
    }

    const averageScore = totalReviews > 0 ? sum / totalReviews : 0;
    questionAverages.push({
      questionId: q.id,
      questionText: q.label,
      averageScore: Math.round(averageScore * 100) / 100,
      totalReviews,
      maxScore: questionMaxScore,
      reviewerAnswers,
    });
  }
  const dynamicMaxScore = questionAverages.reduce((acc, q) => Math.max(acc, q.maxScore ?? 5), 5);
  const allScores = questionAverages.flatMap((q) => (q.reviewerAnswers ?? []).map((r) => r.score));
  const overallAverage =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
      : 0;
  return {
    overallAverage,
    totalReviews: assessments.length,
    questionAverages,
    maxScore: dynamicMaxScore || maxScore,
  };
}
