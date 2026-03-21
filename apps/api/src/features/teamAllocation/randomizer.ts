export type RandomPlannerOptions = {
  seed?: number;
  rng?: () => number;
  minTeamSize?: number;
  maxTeamSize?: number;
};

export type PlannedRandomTeam<T> = {
  index: number;
  members: T[];
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
    const current = result[index];
    const swapValue = result[swapIndex];
    if (current === undefined || swapValue === undefined) {
      continue;
    }
    [result[index], result[swapIndex]] = [swapValue, current];
  }
  return result;
}

function validateTeamSizeConstraints(
  studentCount: number,
  teamCount: number,
  options: RandomPlannerOptions,
) {
  const { minTeamSize, maxTeamSize } = options;

  if (
    minTeamSize !== undefined &&
    (!Number.isInteger(minTeamSize) || minTeamSize < 1)
  ) {
    throw new Error("minTeamSize must be a positive integer");
  }

  if (
    maxTeamSize !== undefined &&
    (!Number.isInteger(maxTeamSize) || maxTeamSize < 1)
  ) {
    throw new Error("maxTeamSize must be a positive integer");
  }

  if (
    minTeamSize !== undefined &&
    maxTeamSize !== undefined &&
    minTeamSize > maxTeamSize
  ) {
    throw new Error("minTeamSize cannot exceed maxTeamSize");
  }

  const min = minTeamSize ?? 0;
  const max = maxTeamSize ?? studentCount;

  if (min * teamCount > studentCount || max * teamCount < studentCount) {
    throw new Error("team size constraints cannot be satisfied for the given student count");
  }

  return { min, max };
}

function buildTeamSizeTargets(
  studentCount: number,
  teamCount: number,
  minTeamSize: number,
  maxTeamSize: number,
) {
  const targets = Array.from({ length: teamCount }, () => minTeamSize);
  let remaining = studentCount - minTeamSize * teamCount;

  while (remaining > 0) {
    let progressed = false;
    for (let teamIndex = 0; teamIndex < teamCount && remaining > 0; teamIndex += 1) {
      if (targets[teamIndex] >= maxTeamSize) {
        continue;
      }
      targets[teamIndex] += 1;
      remaining -= 1;
      progressed = true;
    }

    if (!progressed) {
      throw new Error("team size constraints cannot be satisfied for the given student count");
    }
  }

  return targets;
}

function assignShuffledStudentsToTargets<T>(
  shuffledStudents: T[],
  targets: number[],
): PlannedRandomTeam<T>[] {
  const planned: PlannedRandomTeam<T>[] = targets.map((_unused, index) => ({
    index,
    members: [],
  }));

  let teamIndex = 0;
  for (const student of shuffledStudents) {
    let attempts = 0;
    while (
      attempts < planned.length &&
      planned[teamIndex].members.length >= targets[teamIndex]
    ) {
      teamIndex = (teamIndex + 1) % planned.length;
      attempts += 1;
    }

    if (attempts >= planned.length) {
      throw new Error("team size targets are overfilled");
    }

    planned[teamIndex].members.push(student);
    teamIndex = (teamIndex + 1) % planned.length;
  }

  return planned;
}

export function planRandomTeams<T>(
  students: T[],
  teamCount: number,
  options: RandomPlannerOptions = {},
): PlannedRandomTeam<T>[] {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw new Error("teamCount must be a positive integer");
  }
  if (!Array.isArray(students) || students.length === 0) {
    throw new Error("students must include at least one student");
  }
  if (teamCount > students.length) {
    throw new Error("teamCount cannot exceed the number of students");
  }

  const constraints = validateTeamSizeConstraints(students.length, teamCount, options);
  const rng =
    options.rng ??
    createSeededRng(
      typeof options.seed === "number" && Number.isFinite(options.seed)
        ? options.seed
        : Date.now(),
    );

  const shuffledStudents = shuffle(students, rng);
  const targets = buildTeamSizeTargets(
    students.length,
    teamCount,
    constraints.min,
    constraints.max,
  );
  const planned = assignShuffledStudentsToTargets(shuffledStudents, targets);

  return planned;
}
