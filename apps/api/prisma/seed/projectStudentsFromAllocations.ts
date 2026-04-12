import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";

/**
 * For one project: ensure every user with a TeamAllocation on any team for this project
 * has a ProjectStudent row — allocations should not exist without project membership.
 * Done in reverse for legacy reasons & simpler code (as it's just a seeding)
 */
export async function ensureProjectStudentsFromTeamAllocations(projectId: number): Promise<number> {
  const rows = await prisma.teamAllocation.findMany({
    where: {
      team: {
        projectId,
      },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  const userIds = rows.map((row) => row.userId);
  if (userIds.length === 0) return 0;
  const created = await prisma.projectStudent.createMany({
    data: userIds.map((userId) => ({ projectId, userId })),
    skipDuplicates: true,
  });
  return created.count;
}

/** Run after all membership/scenario steps that may create team allocations. */
export async function seedSyncProjectStudentsFromTeamAllocations(enterpriseId: string) {
  return withSeedLogging("seedSyncProjectStudentsFromTeamAllocations", async () => {
    const projects = await prisma.project.findMany({
      where: { module: { enterpriseId } },
      select: { id: true },
    });
    let rows = 0;
    for (const project of projects) {
      rows += await ensureProjectStudentsFromTeamAllocations(project.id);
    }
    return {
      value: undefined,
      rows,
      details: `projects scanned=${projects.length}`,
    };
  });
}
