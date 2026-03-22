import { prisma } from "../../shared/db.js";

/** Returns the user role by id. */
export function findUserRoleById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { role: true } });
}

/** Returns the all modules. */
export function listAllModules() {
  return prisma.module.findMany({
    select: {
      id: true,
      name: true,
      archivedAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { name: "asc" },
  });
}

/** Returns the all projects. */
export function listAllProjects() {
  return prisma.project.findMany({
    select: {
      id: true,
      name: true,
      archivedAt: true,
      module: { select: { name: true } },
      _count: { select: { teams: true } },
    },
    orderBy: { name: "asc" },
  });
}

/** Returns the all teams. */
export function listAllTeams() {
  return prisma.team.findMany({
    select: {
      id: true,
      teamName: true,
      archivedAt: true,
      project: { select: { name: true } },
      _count: { select: { allocations: true } },
    },
    orderBy: { teamName: "asc" },
  });
}

/** Executes the set module archived. */
export function setModuleArchived(id: number, archivedAt: Date | null) {
  return prisma.module.update({ where: { id }, data: { archivedAt } });
}

/** Executes the set project archived. */
export function setProjectArchived(id: number, archivedAt: Date | null) {
  return prisma.project.update({ where: { id }, data: { archivedAt } });
}

/** Executes the set team archived. */
export function setTeamArchived(id: number, archivedAt: Date | null) {
  return prisma.team.update({ where: { id }, data: { archivedAt } });
}
