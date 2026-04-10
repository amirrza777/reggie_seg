export function resolveTeamSizeTargets(
  totalAssignedStudents: number,
  teamCount: number,
  minTeamSize?: number,
  maxTeamSize?: number,
) {
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

  const minimum = minTeamSize ?? 0;
  const maximum = maxTeamSize ?? totalAssignedStudents;
  if (
    minimum * teamCount > totalAssignedStudents ||
    maximum * teamCount < totalAssignedStudents
  ) {
    throw new Error("team size constraints cannot be satisfied for the given student count");
  }

  const targets = Array.from({ length: teamCount }, () => minimum);
  let remaining = totalAssignedStudents - minimum * teamCount;
  while (remaining > 0) {
    let progressed = false;
    for (let teamIndex = 0; teamIndex < teamCount && remaining > 0; teamIndex += 1) {
      const currentTarget = targets[teamIndex]!;
      if (currentTarget >= maximum) {
        continue;
      }
      targets[teamIndex] = currentTarget + 1;
      remaining -= 1;
      progressed = true;
    }
    if (!progressed) {
      throw new Error("team size constraints cannot be satisfied for the given student count");
    }
  }

  return targets;
}

export function distributeCountAcrossTeamCapacities(totalCount: number, teamCapacities: number[]) {
  const targets = Array.from({ length: teamCapacities.length }, () => 0);
  let remaining = totalCount;

  while (remaining > 0) {
    let progressed = false;
    for (let teamIndex = 0; teamIndex < teamCapacities.length && remaining > 0; teamIndex += 1) {
      const currentTarget = targets[teamIndex]!;
      const teamCapacity = teamCapacities[teamIndex]!;
      if (currentTarget >= teamCapacity) {
        continue;
      }
      targets[teamIndex] = currentTarget + 1;
      remaining -= 1;
      progressed = true;
    }

    if (!progressed) {
      throw new Error("respondents cannot fit into constrained team sizes");
    }
  }

  return targets;
}

export function assignIndexesToTeamTargets(indexes: number[], teamTargets: number[]) {
  const teams = Array.from({ length: teamTargets.length }, () => [] as number[]);

  let teamIndex = 0;
  for (const index of indexes) {
    let attempts = 0;
    while (
      attempts < teamTargets.length &&
      teams[teamIndex]!.length >= teamTargets[teamIndex]!
    ) {
      teamIndex = (teamIndex + 1) % teamTargets.length;
      attempts += 1;
    }

    if (attempts >= teamTargets.length) {
      throw new Error("team size targets are overfilled");
    }

    teams[teamIndex]!.push(index);
    teamIndex = (teamIndex + 1) % teamTargets.length;
  }

  return teams;
}