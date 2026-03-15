import { prisma } from "../../shared/db.js";

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

export function setModuleArchived(id: number, archivedAt: Date | null) {
  return prisma.module.update({ where: { id }, data: { archivedAt } });
}

export function setProjectArchived(id: number, archivedAt: Date | null) {
  return prisma.project.update({ where: { id }, data: { archivedAt } });
}

export function setTeamArchived(id: number, archivedAt: Date | null) {
  return prisma.team.update({ where: { id }, data: { archivedAt } });
}
