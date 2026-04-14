import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import { getScopedStaffUser, isAdminScopedRole } from "../repo/repo.staff-scope.js";

function teamAccessWhere(
  actor: NonNullable<Awaited<ReturnType<typeof getScopedStaffUser>>>,
  actorUserId: number,
  teamId: number,
): Prisma.TeamWhereInput {
  return {
    id: teamId,
    archivedAt: null,
    allocationLifecycle: "ACTIVE",
    project: {
      module: {
        enterpriseId: actor.enterpriseId,
        archivedAt: null,
        ...(isAdminScopedRole(actor.role)
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: actorUserId } } },
                { moduleTeachingAssistants: { some: { userId: actorUserId } } },
              ],
            }),
      },
    },
  };
}

async function assertStaffCanAccessTeam(actorUserId: number, teamId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const isStaffRole = actor.role === "STAFF" || actor.role === "ENTERPRISE_ADMIN" || actor.role === "ADMIN";
  if (!isStaffRole) {
    throw { code: "FORBIDDEN", message: "Only staff can update team deadline profile" };
  }

  const team = await prisma.team.findFirst({
    where: teamAccessWhere(actor, actorUserId, teamId),
    select: { id: true },
  });

  if (!team) {
    throw { code: "TEAM_NOT_FOUND" };
  }
}

export async function updateStaffTeamDeadlineProfile(
  actorUserId: number,
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
) {
  await assertStaffCanAccessTeam(actorUserId, teamId);

  return prisma.team.update({
    where: { id: teamId },
    data: { deadlineProfile },
    select: {
      id: true,
      deadlineProfile: true,
    },
  });
}
