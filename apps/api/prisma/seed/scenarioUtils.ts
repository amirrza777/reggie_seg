import { prisma } from "./prismaClient";

export function uniquePositiveIds(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

export async function resetScenarioDeadlineOverrides(projectId: number, teamId: number, memberIds: number[]) {
  await prisma.teamDeadlineOverride.deleteMany({
    where: { teamId },
  });

  const deadline = await prisma.projectDeadline.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (!deadline) return;

  await prisma.studentDeadlineOverride.deleteMany({
    where: {
      projectDeadlineId: deadline.id,
      userId: { in: memberIds },
    },
  });
}
