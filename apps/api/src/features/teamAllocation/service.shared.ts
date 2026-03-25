import { planRandomTeams } from "./randomizer.js";
import type { CustomAllocationNonRespondentStrategy } from "./service.types.js";

export type TeamSizeConstraints = {
  minTeamSize?: number;
  maxTeamSize?: number;
};

export function normalizeTeamSizeConstraints(input: TeamSizeConstraints): TeamSizeConstraints {
  const { minTeamSize, maxTeamSize } = input;

  if (
    minTeamSize !== undefined &&
    (!Number.isInteger(minTeamSize) || minTeamSize < 1)
  ) {
    throw { code: "INVALID_MIN_TEAM_SIZE" };
  }

  if (
    maxTeamSize !== undefined &&
    (!Number.isInteger(maxTeamSize) || maxTeamSize < 1)
  ) {
    throw { code: "INVALID_MAX_TEAM_SIZE" };
  }

  if (
    minTeamSize !== undefined &&
    maxTeamSize !== undefined &&
    minTeamSize > maxTeamSize
  ) {
    throw { code: "INVALID_TEAM_SIZE_RANGE" };
  }

  return {
    ...(minTeamSize !== undefined ? { minTeamSize } : {}),
    ...(maxTeamSize !== undefined ? { maxTeamSize } : {}),
  };
}

function resolveConstrainedPlanningShape(
  studentCount: number,
  teamCount: number,
  constraints: TeamSizeConstraints,
) {
  const minimum = constraints.minTeamSize ?? 0;
  const maximum = constraints.maxTeamSize ?? studentCount;

  const maxTeamsByMinimum = minimum === 0 ? teamCount : Math.floor(studentCount / minimum);
  const activeTeamCount = Math.max(0, Math.min(teamCount, maxTeamsByMinimum));
  if (activeTeamCount === 0) {
    return { activeTeamCount: 0, assignableStudentCount: 0 };
  }

  const assignableStudentCount = Math.min(studentCount, activeTeamCount * maximum);
  return { activeTeamCount, assignableStudentCount };
}

function shuffleForPlanning<T>(students: T[]): T[] {
  if (students.length <= 1) {
    return [...students];
  }
  const shuffledSingletonTeams = planRandomTeams(students, students.length);
  return shuffledSingletonTeams.flatMap((team) => team.members);
}

export function buildConstrainedRandomPlan<TStudent>(
  students: TStudent[],
  teamCount: number,
  constraints: TeamSizeConstraints,
) {
  const shape = resolveConstrainedPlanningShape(students.length, teamCount, constraints);
  const shuffledStudents = shuffleForPlanning(students);
  const assignedStudents = shuffledStudents.slice(0, shape.assignableStudentCount);
  const unassignedStudents = shuffledStudents.slice(shape.assignableStudentCount);

  const activeTeams =
    shape.activeTeamCount > 0 && assignedStudents.length > 0
      ? planRandomTeams(assignedStudents, shape.activeTeamCount, constraints)
      : [];

  const teams = Array.from({ length: teamCount }, (_unused, index) => {
    const activeTeam = activeTeams[index];
    return {
      index,
      members: activeTeam ? activeTeam.members : ([] as TStudent[]),
    };
  });

  return {
    teams,
    unassignedStudents,
  };
}

export function buildConstrainedCustomPopulation<TRespondent, TNonRespondent>(
  respondents: TRespondent[],
  nonRespondents: TNonRespondent[],
  teamCount: number,
  constraints: TeamSizeConstraints,
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy,
) {
  const candidateCount =
    nonRespondentStrategy === "exclude"
      ? respondents.length
      : respondents.length + nonRespondents.length;
  const shape = resolveConstrainedPlanningShape(candidateCount, teamCount, constraints);

  const shuffledRespondents = shuffleForPlanning(respondents);
  const shuffledNonRespondents = shuffleForPlanning(nonRespondents);
  const assignableRespondentCount = Math.min(
    shuffledRespondents.length,
    shape.assignableStudentCount,
  );
  const remainingNonRespondentCapacity =
    nonRespondentStrategy === "distribute_randomly"
      ? Math.max(0, shape.assignableStudentCount - assignableRespondentCount)
      : 0;
  const assignableNonRespondentCount = Math.min(
    shuffledNonRespondents.length,
    remainingNonRespondentCapacity,
  );

  return {
    activeTeamCount: shape.activeTeamCount,
    assignableRespondents: shuffledRespondents.slice(0, assignableRespondentCount),
    unassignedRespondents: shuffledRespondents.slice(assignableRespondentCount),
    assignableNonRespondents: shuffledNonRespondents.slice(0, assignableNonRespondentCount),
    unassignedNonRespondents:
      nonRespondentStrategy === "exclude"
        ? shuffledNonRespondents
        : shuffledNonRespondents.slice(assignableNonRespondentCount),
  };
}