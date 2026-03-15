export type RandomPlannerOptions = {
  seed?: number;
  rng?: () => number;
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
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
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

  const rng =
    options.rng ??
    createSeededRng(
      typeof options.seed === "number" && Number.isFinite(options.seed)
        ? options.seed
        : Date.now(),
    );

  const shuffledStudents = shuffle(students, rng);
  const planned: PlannedRandomTeam<T>[] = Array.from({ length: teamCount }, (_unused, index) => ({
    index,
    members: [],
  }));

  shuffledStudents.forEach((student, index) => {
    planned[index % teamCount].members.push(student);
  });

  return planned;
}