import type { ArchiveTab } from "../types";
import type { ArchiveListScope } from "./archiveScopes";

export function archiveTableEmptyMessage(
  activeTab: ArchiveTab,
  moduleListScope: ArchiveListScope,
  projectListScope: ArchiveListScope,
): string | undefined {
  if (activeTab === "modules") {
    if (moduleListScope === "active") return "No active modules.";
    if (moduleListScope === "archived") return "No archived modules.";
    return "No modules found.";
  }
  if (activeTab === "projects") {
    if (projectListScope === "active") {
      return "No active projects (the module and the project must both be unarchived).";
    }
    if (projectListScope === "archived") {
      return "No archived projects (the module or the project is archived).";
    }
    return "No projects found.";
  }
  return undefined;
}
