import { withSeedLogging } from "../logging";
import { prisma } from "../prismaClient";

export async function seedAdminTeamAllocation(enterpriseId: string) {
  return withSeedLogging("seedAdminTeamAllocation", async () => {
    const admin = await prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: "admin@kcl.ac.uk" } },
      select: { id: true },
    });
    if (!admin) return { value: undefined, rows: 0, details: "skipped (admin user not found)" };

    const teamLookup = await findFirstEnterpriseTeam(enterpriseId);
    if (teamLookup.kind === "no_project") return { value: undefined, rows: 0, details: "skipped (no project found)" };
    if (teamLookup.kind === "no_team") return { value: undefined, rows: 0, details: "skipped (no team for first project)" };
    const team = teamLookup.team;

    const existing = await prisma.teamAllocation.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: admin.id } },
      select: { userId: true },
    });
    await prisma.teamAllocation.upsert({
      where: { teamId_userId: { teamId: team.id, userId: admin.id } },
      update: {},
      create: { teamId: team.id, userId: admin.id },
    });
    return {
      value: undefined,
      rows: existing ? 0 : 1,
      details: existing ? "allocation already exists" : "admin allocated to first team",
    };
  });
}

async function findFirstEnterpriseTeam(enterpriseId: string) {
  const firstProject = await prisma.project.findFirst({
    where: { module: { enterpriseId } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (!firstProject) return { kind: "no_project" as const };
  const team = await prisma.team.findFirst({
    where: { enterpriseId, projectId: firstProject.id },
    select: { id: true },
  });
  if (!team) return { kind: "no_team" as const };
  return { kind: "ok" as const, team };
}
