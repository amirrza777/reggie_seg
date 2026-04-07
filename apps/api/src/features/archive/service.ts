import { findUserRoleById, listAllModules, listAllProjects, setModuleArchived, setProjectArchived } from "./repo.js";

/** Returns the modules. */
export function getModules() {
  return listAllModules();
}

/** Returns the projects. */
export function getProjects() {
  return listAllProjects();
}

/** Returns whether the user is staff, enterprise admin, or admin. */
export async function isStaffOrAdmin(userId: number | undefined) {
  if (!userId) return false;
  const user = await findUserRoleById(userId);
  const role = user?.role;
  return role === "STAFF" || role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

/** Archives the module. */
export function archiveModule(id: number) {
  return setModuleArchived(id, new Date());
}

/** Restores the module. */
export function unarchiveModule(id: number) {
  return setModuleArchived(id, null);
}

/** Archives the project. */
export function archiveProject(id: number) {
  return setProjectArchived(id, new Date());
}

/** Restores the project. */
export function unarchiveProject(id: number) {
  return setProjectArchived(id, null);
}
