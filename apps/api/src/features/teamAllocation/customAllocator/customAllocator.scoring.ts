import {
  mean,
  normalizeResponseValue,
  roundToTwo,
  variance,
} from "./customAllocator.helpers.js";
import type {
  CriterionRuntime,
  CustomAllocationCriterion,
  CustomAllocationRespondent,
} from "./customAllocator.types.js";
import { EPSILON } from "./customAllocator.types.js";

export function buildCriterionRuntime<TStudent extends { id: number }>(
  respondents: Array<CustomAllocationRespondent<TStudent>>,
  criterion: CustomAllocationCriterion,
): CriterionRuntime {
  const values = respondents.map((student) =>
    normalizeResponseValue((student.responses as Record<string, unknown>)[String(criterion.questionId)]),
  );
  const validValues = values.filter((value): value is number | string => value !== null);
  const isNumeric = validValues.every((value) => typeof value === "number");

  if (isNumeric) {
    const numericValues = validValues as number[];
    const globalMean = mean(numericValues);
    const globalVariance = variance(numericValues, globalMean);
    return {
      questionId: criterion.questionId,
      strategy: criterion.strategy,
      weight: criterion.weight,
      kind: "numeric",
      values,
      validCount: numericValues.length,
      numericGlobalMean: globalMean,
      numericGlobalVariance: globalVariance,
      numericGlobalStd: Math.sqrt(globalVariance),
      categoricalGlobalCounts: new Map<string, number>(),
    };
  }

  const categoricalCounts = new Map<string, number>();
  for (const value of validValues) {
    const key = String(value);
    categoricalCounts.set(key, (categoricalCounts.get(key) ?? 0) + 1);
  }

  return {
    questionId: criterion.questionId,
    strategy: criterion.strategy,
    weight: criterion.weight,
    kind: "categorical",
    values,
    validCount: validValues.length,
    numericGlobalMean: 0,
    numericGlobalVariance: 0,
    numericGlobalStd: 0,
    categoricalGlobalCounts: categoricalCounts,
  };
}

function scoreDiversifyNumeric(criterion: CriterionRuntime, teams: number[][]): number {
  if (criterion.validCount === 0) {
    return 1;
  }

  let weightedDistance = 0;
  let totalWeight = 0;
  for (const team of teams) {
    const values = team
      .map((index) => criterion.values[index])
      .filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      continue;
    }
    const teamMean = mean(values);
    const distance = Math.abs(teamMean - criterion.numericGlobalMean) / (criterion.numericGlobalStd + EPSILON);
    weightedDistance += distance * values.length;
    totalWeight += values.length;
  }

  if (totalWeight === 0) {
    return 1;
  }

  const averageDistance = weightedDistance / totalWeight;
  return 1 / (1 + averageDistance);
}

function scoreDiversifyCategorical(criterion: CriterionRuntime, teams: number[][]): number {
  if (criterion.validCount === 0) {
    return 1;
  }

  let weightedDistance = 0;
  let totalWeight = 0;
  const categories = Array.from(criterion.categoricalGlobalCounts.keys());

  for (const team of teams) {
    const values = team
      .map((index) => criterion.values[index])
      .filter((value): value is string => typeof value === "string");
    const teamSize = values.length;
    if (teamSize === 0) {
      continue;
    }

    const teamCounts = new Map<string, number>();
    for (const value of values) {
      teamCounts.set(value, (teamCounts.get(value) ?? 0) + 1);
    }

    let chiSquared = 0;
    for (const category of categories) {
      const globalCount = criterion.categoricalGlobalCounts.get(category) ?? 0;
      const expected = (globalCount / criterion.validCount) * teamSize;
      const actual = teamCounts.get(category) ?? 0;
      chiSquared += ((actual - expected) ** 2) / (expected + EPSILON);
    }

    const normalizedDistance = chiSquared / (teamSize + EPSILON);
    weightedDistance += normalizedDistance * teamSize;
    totalWeight += teamSize;
  }

  if (totalWeight === 0) {
    return 1;
  }

  const averageDistance = weightedDistance / totalWeight;
  return 1 / (1 + averageDistance);
}

function scoreGroupNumeric(criterion: CriterionRuntime, teams: number[][]): number {
  if (criterion.validCount === 0 || criterion.numericGlobalVariance < EPSILON) {
    return 1;
  }

  let weightedVarianceRatio = 0;
  let totalWeight = 0;
  for (const team of teams) {
    const values = team
      .map((index) => criterion.values[index])
      .filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      continue;
    }

    const teamVariance = variance(values);
    const ratio = teamVariance / (criterion.numericGlobalVariance + EPSILON);
    weightedVarianceRatio += ratio * values.length;
    totalWeight += values.length;
  }

  if (totalWeight === 0) {
    return 1;
  }

  const averageRatio = weightedVarianceRatio / totalWeight;
  return 1 / (1 + averageRatio);
}

function scoreGroupCategorical(criterion: CriterionRuntime, teams: number[][]): number {
  if (criterion.validCount === 0) {
    return 1;
  }

  let weightedHomogeneity = 0;
  let totalWeight = 0;

  for (const team of teams) {
    const values = team
      .map((index) => criterion.values[index])
      .filter((value): value is string => typeof value === "string");
    const teamSize = values.length;
    if (teamSize === 0) {
      continue;
    }

    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const dominantCount = Math.max(...counts.values());
    const homogeneity = dominantCount / teamSize;
    weightedHomogeneity += homogeneity * teamSize;
    totalWeight += teamSize;
  }

  if (totalWeight === 0) {
    return 1;
  }

  return weightedHomogeneity / totalWeight;
}

export function scoreCriterion(criterion: CriterionRuntime, teams: number[][]): number {
  if (criterion.strategy === "diversify") {
    if (criterion.kind === "numeric") {
      return scoreDiversifyNumeric(criterion, teams);
    }
    return scoreDiversifyCategorical(criterion, teams);
  }

  if (criterion.kind === "numeric") {
    return scoreGroupNumeric(criterion, teams);
  }
  return scoreGroupCategorical(criterion, teams);
}

export function buildTeamCriterionBreakdowns(criteria: CriterionRuntime[], teams: number[][]) {
  return teams.map((team, teamIndex) => ({
    teamIndex,
    criteria: criteria.map((criterion) => {
      const values = team
        .map((index) => criterion.values[index])
        .filter((value): value is number | string => value !== null);

      if (values.length === 0) {
        return {
          questionId: criterion.questionId,
          strategy: criterion.strategy,
          weight: criterion.weight,
          responseCount: 0,
          summary: { kind: "none" as const },
        };
      }

      if (criterion.kind === "numeric") {
        const numericValues = values as number[];
        const average = mean(numericValues);
        return {
          questionId: criterion.questionId,
          strategy: criterion.strategy,
          weight: criterion.weight,
          responseCount: numericValues.length,
          summary: {
            kind: "numeric" as const,
            average: roundToTwo(average),
            min: roundToTwo(Math.min(...numericValues)),
            max: roundToTwo(Math.max(...numericValues)),
          },
        };
      }

      const counts = new Map<string, number>();
      for (const value of values) {
        const key = String(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const categories = Array.from(counts.entries())
        .sort((left, right) => {
          if (right[1] !== left[1]) {
            return right[1] - left[1];
          }
          return left[0].localeCompare(right[0]);
        })
        .map(([value, count]) => ({ value, count }));

      return {
        questionId: criterion.questionId,
        strategy: criterion.strategy,
        weight: criterion.weight,
        responseCount: values.length,
        summary: {
          kind: "categorical" as const,
          categories,
        },
      };
    }),
  }));
}

export function evaluateOverallScore(criteria: CriterionRuntime[], teams: number[][]): number {
  if (criteria.length === 0) {
    return 0;
  }

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weighted = criteria.reduce(
    (sum, criterion) => sum + scoreCriterion(criterion, teams) * criterion.weight,
    0,
  );
  return weighted / totalWeight;
}

export function pickDistinctTeamPair(teams: number[][], rng: () => number): [number, number] | null {
  const nonEmptyTeamIndexes = teams
    .map((team, index) => ({ index, size: team.length }))
    .filter((entry) => entry.size > 0)
    .map((entry) => entry.index);

  if (nonEmptyTeamIndexes.length < 2) {
    return null;
  }

  const first = nonEmptyTeamIndexes[Math.floor(rng() * nonEmptyTeamIndexes.length)]!;
  let second = first;
  while (second === first) {
    second = nonEmptyTeamIndexes[Math.floor(rng() * nonEmptyTeamIndexes.length)]!;
  }
  return [first, second];
}