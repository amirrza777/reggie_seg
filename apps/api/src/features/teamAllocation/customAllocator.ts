type AllocationStrategy = "diversify" | "group";
type NonRespondentStrategy = "distribute_randomly" | "exclude";

const EPSILON = 1e-9;

export type CustomAllocationCriterion = {
  questionId: number;
  strategy: AllocationStrategy;
  weight: number;
};

export type CustomAllocationRespondent<TStudent extends { id: number }> = TStudent & {
  responses: Record<number, unknown>;
};

export type CustomAllocationTeamMember<TStudent extends { id: number }> = TStudent & {
  responseStatus: "RESPONDED" | "NO_RESPONSE";
};

export type CustomAllocationPlan<TStudent extends { id: number }> = {
  teams: Array<{
    index: number;
    members: CustomAllocationTeamMember<TStudent>[];
  }>;
  unassignedNonRespondents: TStudent[];
  criterionScores: Array<{
    questionId: number;
    strategy: AllocationStrategy;
    weight: number;
    satisfactionScore: number;
  }>;
  teamCriterionBreakdowns: Array<{
    teamIndex: number;
    criteria: Array<{
      questionId: number;
      strategy: AllocationStrategy;
      weight: number;
      responseCount: number;
      summary:
        | {
            kind: "none";
          }
        | {
            kind: "numeric";
            average: number;
            min: number;
            max: number;
          }
        | {
            kind: "categorical";
            categories: Array<{
              value: string;
              count: number;
            }>;
          };
    }>;
  }>;
  overallScore: number;
};

export type CustomAllocationPlannerInput<TStudent extends { id: number }> = {
  respondents: Array<CustomAllocationRespondent<TStudent>>;
  nonRespondents: TStudent[];
  criteria: CustomAllocationCriterion[];
  teamCount: number;
  nonRespondentStrategy: NonRespondentStrategy;
  seed?: number;
  iterations?: number;
};

type CriterionRuntime = {
  questionId: number;
  strategy: AllocationStrategy;
  weight: number;
  kind: "numeric" | "categorical";
  values: Array<number | string | null>;
  validCount: number;
  numericGlobalMean: number;
  numericGlobalVariance: number;
  numericGlobalStd: number;
  categoricalGlobalCounts: Map<string, number>;
};

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function normalizeResponseValue(value: unknown): number | string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric;
    }
    return trimmed;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[], valuesMean?: number): number {
  if (values.length < 2) {
    return 0;
  }
  const center = valuesMean ?? mean(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length;
}

function buildCriterionRuntime<TStudent extends { id: number }>(
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

function scoreCriterion(criterion: CriterionRuntime, teams: number[][]): number {
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

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function buildTeamCriterionBreakdowns(criteria: CriterionRuntime[], teams: number[][]) {
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

function evaluateOverallScore(criteria: CriterionRuntime[], teams: number[][]): number {
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

function pickDistinctTeamPair(teams: number[][], rng: () => number): [number, number] | null {
  const nonEmptyTeamIndexes = teams
    .map((team, index) => ({ index, size: team.length }))
    .filter((entry) => entry.size > 0)
    .map((entry) => entry.index);

  if (nonEmptyTeamIndexes.length < 2) {
    return null;
  }

  const first = nonEmptyTeamIndexes[Math.floor(rng() * nonEmptyTeamIndexes.length)];
  let second = first;
  while (second === first) {
    second = nonEmptyTeamIndexes[Math.floor(rng() * nonEmptyTeamIndexes.length)];
  }
  return [first, second];
}

function stripResponses<TStudent extends { id: number }>(
  student: TStudent | CustomAllocationRespondent<TStudent>,
): TStudent {
  const copy = { ...(student as Record<string, unknown>) };
  delete copy.responses;
  return copy as TStudent;
}

export function planCustomAllocationTeams<TStudent extends { id: number }>(
  input: CustomAllocationPlannerInput<TStudent>,
): CustomAllocationPlan<TStudent> {
  const respondents = Array.isArray(input.respondents) ? input.respondents : [];
  const nonRespondents = Array.isArray(input.nonRespondents) ? input.nonRespondents : [];

  if (!Number.isInteger(input.teamCount) || input.teamCount < 1) {
    throw new Error("teamCount must be a positive integer");
  }

  const totalStudents = respondents.length + nonRespondents.length;
  if (totalStudents === 0) {
    throw new Error("students must include at least one student");
  }
  if (input.teamCount > totalStudents) {
    throw new Error("teamCount cannot exceed the number of students");
  }

  if (input.criteria.some((criterion) => criterion.weight < 1 || criterion.weight > 5)) {
    throw new Error("criterion weights must be between 1 and 5");
  }

  const rng = createSeededRng(
    typeof input.seed === "number" && Number.isFinite(input.seed) ? input.seed : Date.now(),
  );

  const respondentIndexes = respondents.map((_unused, index) => index);
  const shuffledRespondentIndexes = shuffle(respondentIndexes, rng);
  const teams: number[][] = Array.from({ length: input.teamCount }, () => []);
  shuffledRespondentIndexes.forEach((respondentIndex, index) => {
    teams[index % input.teamCount].push(respondentIndex);
  });

  const criteriaRuntime = input.criteria.map((criterion) => buildCriterionRuntime(respondents, criterion));
  const iterationCount =
    typeof input.iterations === "number" && input.iterations > 0
      ? Math.floor(input.iterations)
      : respondents.length * 50;

  let currentScore = evaluateOverallScore(criteriaRuntime, teams);
  let bestScore = currentScore;
  let bestTeams = teams.map((team) => [...team]);

  if (teams.length > 1 && respondents.length > 1 && criteriaRuntime.length > 0 && iterationCount > 0) {
    let temperature = 0.2;

    for (let iteration = 0; iteration < iterationCount; iteration += 1) {
      const teamPair = pickDistinctTeamPair(teams, rng);
      if (!teamPair) {
        break;
      }

      const [teamAIndex, teamBIndex] = teamPair;
      const teamA = teams[teamAIndex];
      const teamB = teams[teamBIndex];
      const memberAIndex = Math.floor(rng() * teamA.length);
      const memberBIndex = Math.floor(rng() * teamB.length);

      const memberA = teamA[memberAIndex];
      const memberB = teamB[memberBIndex];
      teamA[memberAIndex] = memberB;
      teamB[memberBIndex] = memberA;

      const swappedScore = evaluateOverallScore(criteriaRuntime, teams);
      const delta = swappedScore - currentScore;
      const acceptGreedy = delta >= 0;
      const acceptAnnealed =
        !acceptGreedy && Math.exp(delta / Math.max(temperature, EPSILON)) > rng();

      if (acceptGreedy || acceptAnnealed) {
        currentScore = swappedScore;
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestTeams = teams.map((team) => [...team]);
        }
      } else {
        teamA[memberAIndex] = memberA;
        teamB[memberBIndex] = memberB;
      }

      temperature = Math.max(0.005, temperature * 0.9995);
    }
  }

  const criterionScores = criteriaRuntime.map((criterion) => ({
    questionId: criterion.questionId,
    strategy: criterion.strategy,
    weight: criterion.weight,
    satisfactionScore: Number(scoreCriterion(criterion, bestTeams).toFixed(4)),
  }));
  const teamCriterionBreakdowns = buildTeamCriterionBreakdowns(criteriaRuntime, bestTeams);

  const teamsWithMembers: Array<{
    index: number;
    members: CustomAllocationTeamMember<TStudent>[];
  }> = bestTeams.map((team, index) => ({
    index,
    members: team.map((respondentIndex) => ({
      ...stripResponses(respondents[respondentIndex]),
      responseStatus: "RESPONDED" as const,
    })),
  }));

  let unassignedNonRespondents: TStudent[] = [];
  if (input.nonRespondentStrategy === "distribute_randomly") {
    const shuffledNonRespondents = shuffle(nonRespondents, rng);
    const startOffset = input.teamCount === 1 ? 0 : Math.floor(rng() * input.teamCount);
    shuffledNonRespondents.forEach((student, index) => {
      const teamIndex = (startOffset + index) % input.teamCount;
      teamsWithMembers[teamIndex].members.push({
        ...stripResponses(student),
        responseStatus: "NO_RESPONSE",
      });
    });
  } else {
    unassignedNonRespondents = nonRespondents.map((student) => stripResponses(student));
  }

  return {
    teams: teamsWithMembers,
    unassignedNonRespondents,
    criterionScores,
    teamCriterionBreakdowns,
    overallScore: Number(bestScore.toFixed(4)),
  };
}