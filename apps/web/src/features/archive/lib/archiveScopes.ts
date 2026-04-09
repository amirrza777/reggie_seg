import type { ArchivableModule, ArchivableProject } from "../types";

/** Modules: active = unarchived module. Projects: active = module and project both unarchived. Archived projects = anything not fully active. */
export type ArchiveListScope = "active" | "archived" | "all";

export function isFullyActiveProject(project: ArchivableProject): boolean {
  return project.archivedAt == null && project.module.archivedAt == null;
}

export function filterModulesByScope(modules: ArchivableModule[], scope: ArchiveListScope): ArchivableModule[] {
  if (scope === "active") return modules.filter((m) => m.archivedAt == null);
  if (scope === "archived") return modules.filter((m) => m.archivedAt != null);
  return modules;
}

export function filterProjectsByScope(projects: ArchivableProject[], scope: ArchiveListScope): ArchivableProject[] {
  if (scope === "active") return projects.filter(isFullyActiveProject);
  if (scope === "archived") return projects.filter((p) => !isFullyActiveProject(p));
  return projects;
}
