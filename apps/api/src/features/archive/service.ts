import {
  findUserRoleById,
  findArchiveActor,
  listModulesForArchiveActor,
  listProjectsForArchiveActor,
  findModuleIdForArchiveActorIfScoped,
  findProjectIdForArchiveActorIfScoped,
  setModuleArchived,
  setProjectArchived,
} from "./repo.js";

/** Returns modules in the current user’s enterprise (and membership scope for staff). */
export async function getModules(userId: number) {
  const actor = await findArchiveActor(userId);
  if (!actor || !actor.active) return [];
  return listModulesForArchiveActor(actor);
}

/** Returns projects whose module user has access to */
export async function getProjects(userId: number) {
  const actor = await findArchiveActor(userId);
  if (!actor || !actor.active) return [];
  return listProjectsForArchiveActor(actor);
}

/** Returns whether the user is staff, enterprise admin, or admin. */
export async function isStaffOrAdmin(userId: number | undefined) {
  if (!userId) return false;
  const user = await findUserRoleById(userId);
  const role = user?.role;
  return role === "STAFF" || role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

/** Archives the module when user allowed to; otherwise null. */
export async function archiveModule(userId: number, moduleId: number) {
  const actor = await findArchiveActor(userId);
  if (!actor?.active) return null;
  const scoped = await findModuleIdForArchiveActorIfScoped(actor, moduleId);
  if (!scoped) return null;
  return setModuleArchived(moduleId, new Date());
}

/** Restores the module when user allowed; otherwise null. */
export async function unarchiveModule(userId: number, moduleId: number) {
  const actor = await findArchiveActor(userId);
  if (!actor?.active) return null;
  const scoped = await findModuleIdForArchiveActorIfScoped(actor, moduleId);
  if (!scoped) return null;
  return setModuleArchived(moduleId, null);
}

/** Archives the project when its module in actor’s scope; otherwise null. */
export async function archiveProject(userId: number, projectId: number) {
  const actor = await findArchiveActor(userId);
  if (!actor?.active) return null;
  const scoped = await findProjectIdForArchiveActorIfScoped(actor, projectId);
  if (!scoped) return null;
  return setProjectArchived(projectId, new Date());
}

/** Restores the project when its module in actor’s scope; otherwise null. */
export async function unarchiveProject(userId: number, projectId: number) {
  const actor = await findArchiveActor(userId);
  if (!actor?.active) return null;
  const scoped = await findProjectIdForArchiveActorIfScoped(actor, projectId);
  if (!scoped) return null;
  return setProjectArchived(projectId, null);
}
