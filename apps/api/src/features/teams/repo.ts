import { prisma } from "../../shared/db.js";

export function findUserRoleById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { role: true } });
}

export function findTeamById(id: number) {
  return prisma.team.findUnique({ where: { id }, select: { id: true } });
}

export function dismissTeamFlag(id: number) {
  return prisma.team.update({ where: { id }, data: { inactivityFlag: "NONE" } });
}
