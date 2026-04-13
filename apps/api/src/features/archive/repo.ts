import { prisma } from "../../shared/db.js";
import { buildModuleMembershipFilterForUser, type ModuleMembershipUser } from "../projects/repo/repo.modules.js";

/** Returns the user role by id. */
export function findUserRoleById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { role: true } });
}

export type ArchiveListActor = {
  id: number;
  role: string;
  enterpriseId: string;
  active: boolean;
};

export function findArchiveActor(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true, active: true },
  });
}

function toModuleMembershipUser(actor: ArchiveListActor): ModuleMembershipUser {
  return { id: actor.id, role: actor.role, enterpriseId: actor.enterpriseId };
}

const MODULE_ARCHIVE_LIST_SELECT = {
  id: true,
  name: true,
  archivedAt: true,
  _count: { select: { projects: true } },
} as const;

const PROJECT_ARCHIVE_LIST_SELECT = {
  id: true,
  name: true,
  archivedAt: true,
  module: { select: { name: true, archivedAt: true } },
  _count: { select: { teams: true } },
} as const;

/** Lists modules visible to this actor (enterprise + same membership rules as staff module lists). */
export function listModulesForArchiveActor(actor: ArchiveListActor) {
  const where = buildModuleMembershipFilterForUser(toModuleMembershipUser(actor), false);
  return prisma.module.findMany({
    where,
    select: MODULE_ARCHIVE_LIST_SELECT,
    orderBy: { name: "asc" },
  });
}

/** Lists projects whose parent module is visible to this actor. */
export function listProjectsForArchiveActor(actor: ArchiveListActor) {
  const moduleWhere = buildModuleMembershipFilterForUser(toModuleMembershipUser(actor), false);
  return prisma.project.findMany({
    where: { module: moduleWhere },
    select: PROJECT_ARCHIVE_LIST_SELECT,
    orderBy: [{ module: { name: "asc" } }, { name: "asc" }],
  });
}

export function findModuleIdForArchiveActorIfScoped(actor: ArchiveListActor, moduleId: number) {
  const base = buildModuleMembershipFilterForUser(toModuleMembershipUser(actor), false);
  return prisma.module.findFirst({
    where: { ...base, id: moduleId },
    select: { id: true },
  });
}

export function findProjectIdForArchiveActorIfScoped(actor: ArchiveListActor, projectId: number) {
  const moduleWhere = buildModuleMembershipFilterForUser(toModuleMembershipUser(actor), false);
  return prisma.project.findFirst({
    where: { id: projectId, module: moduleWhere },
    select: { id: true },
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
