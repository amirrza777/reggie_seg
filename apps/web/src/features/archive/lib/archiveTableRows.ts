import type { ArchivableModule, ArchivableProject, ArchiveTab } from "../types";
import { projectArchiveModuleStatusTooltip } from "./archiveMessages";

export type ArchiveTableRowModel = {
  id: number;
  name: string;
  subtitle: string;
  archivedAt: string | null;
  moduleArchived?: boolean;
  moduleArchivedAt?: string | null;
  moduleStatusTitle?: string;
};

export function getArchiveTableRows(
  activeTab: ArchiveTab,
  modules: ArchivableModule[],
  projects: ArchivableProject[],
): ArchiveTableRowModel[] {
  if (activeTab === "modules") {
    return modules.map((item) => ({
      id: item.id,
      name: item.name,
      subtitle: `${item._count.projects} project${item._count.projects !== 1 ? "s" : ""}`,
      archivedAt: item.archivedAt,
    }));
  }
  return projects.map((item) => {
    const moduleArchived = item.module.archivedAt != null;
    const projectArchived = item.archivedAt != null;
    return {
      id: item.id,
      name: item.name,
      subtitle: `${item.module.name} · ${item._count.teams} team${item._count.teams !== 1 ? "s" : ""}`,
      archivedAt: item.archivedAt,
      moduleArchived,
      moduleArchivedAt: item.module.archivedAt,
      moduleStatusTitle: projectArchiveModuleStatusTooltip(moduleArchived, projectArchived),
    };
  });
}
