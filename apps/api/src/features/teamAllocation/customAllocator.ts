import { createSeededRng, shuffle, stripResponses } from "./customAllocator.helpers.js";
import {
  buildCriterionRuntime,
  buildTeamCriterionBreakdowns,
  evaluateOverallScore,
  pickDistinctTeamPair,
  scoreCriterion,
} from "./customAllocator.scoring.js";
import {
  assignIndexesToTeamTargets,
  distributeCountAcrossTeamCapacities,
  resolveTeamSizeTargets,
} from "./customAllocator.validation.js";
import type {
  CustomAllocationPlan,
  CustomAllocationPlannerInput,
  CustomAllocationTeamMember,
} from "./customAllocator.types.js";
import { EPSILON } from "./customAllocator.types.js";

export * from "./customAllocator.helpers.js";
export * from "./customAllocator.scoring.js";
export * from "./customAllocator.types.js";
export * from "./customAllocator.validation.js";

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

  const totalAssignedStudents =
    input.nonRespondentStrategy === "exclude"
      ? respondents.length
      : respondents.length + nonRespondents.length;
  const teamSizeTargets = resolveTeamSizeTargets(
    totalAssignedStudents,
    input.teamCount,
    input.minTeamSize,
    input.maxTeamSize,
  );

  const rng = createSeededRng(
    typeof input.seed === "number" && Number.isFinite(input.seed) ? input.seed : Date.now(),
  );

  const respondentIndexes = respondents.map((_unused, index) => index);
  const shuffledRespondentIndexes = shuffle(respondentIndexes, rng);
  const respondentTeamTargets = distributeCountAcrossTeamCapacities(
    respondents.length,
    teamSizeTargets,
  );
  const teams = assignIndexesToTeamTargets(shuffledRespondentIndexes, respondentTeamTargets);

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
      const teamA = teams[teamAIndex]!;
      const teamB = teams[teamBIndex]!;
      const memberAIndex = Math.floor(rng() * teamA.length);
      const memberBIndex = Math.floor(rng() * teamB.length);

      const memberA = teamA[memberAIndex]!;
      const memberB = teamB[memberBIndex]!;
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
      ...stripResponses(respondents[respondentIndex]!),
      responseStatus: "RESPONDED" as const,
    })),
  }));

  let unassignedNonRespondents: TStudent[] = [];
  if (input.nonRespondentStrategy === "distribute_randomly") {
    const shuffledNonRespondents = shuffle(nonRespondents, rng);
    const remainingCapacities = teamSizeTargets.map(
      (target, teamIndex) => target - teamsWithMembers[teamIndex]!.members.length,
    );
    if (remainingCapacities.some((capacity) => capacity < 0)) {
      throw new Error("team size targets are overfilled");
    }

    const totalRemainingCapacity = remainingCapacities.reduce((sum, capacity) => sum + capacity, 0);
    if (totalRemainingCapacity !== shuffledNonRespondents.length) {
      throw new Error("team size constraints cannot be satisfied for non-respondent distribution");
    }

    const teamOrder = Array.from({ length: input.teamCount }, (_unused, index) => index);
    const startOffset = input.teamCount === 1 ? 0 : Math.floor(rng() * input.teamCount);
    const rotatedTeamOrder = [
      ...teamOrder.slice(startOffset),
      ...teamOrder.slice(0, startOffset),
    ];

    let orderIndex = 0;
    for (const student of shuffledNonRespondents) {
      let attempts = 0;
      while (
        attempts < rotatedTeamOrder.length &&
        remainingCapacities[rotatedTeamOrder[orderIndex]!]! <= 0
      ) {
        orderIndex = (orderIndex + 1) % rotatedTeamOrder.length;
        attempts += 1;
      }

      if (attempts >= rotatedTeamOrder.length) {
        throw new Error("team size targets are overfilled");
      }

      const teamIndex = rotatedTeamOrder[orderIndex]!;
      teamsWithMembers[teamIndex]!.members.push({
        ...stripResponses(student),
        responseStatus: "NO_RESPONSE",
      });
      remainingCapacities[teamIndex] = remainingCapacities[teamIndex]! - 1;
      orderIndex = (orderIndex + 1) % rotatedTeamOrder.length;
    }
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