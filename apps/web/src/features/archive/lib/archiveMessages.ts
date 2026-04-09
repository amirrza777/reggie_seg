import { formatDate } from "@/shared/lib/formatDate";

export function projectArchiveModuleStatusTooltip(moduleArchived: boolean, projectArchived: boolean): string {
  if (!moduleArchived && !projectArchived) {
    return "The parent module and this project are both active.";
  }
  if (!moduleArchived && projectArchived) {
    return "This project is archived; the parent module is still active. Clicking 'unarchive' will restore editing to this project.";
  }
  if (moduleArchived && !projectArchived) {
    return "The parent module is archived, so this project is read-only until the module is unarchived.";
  }
  return "Both the module and project are archived. Both will need to be unarchived to re-enable editing of this project.";
}

export function archiveCalendarTooltip(archivedAt: string | null | undefined, isArchived: boolean): string {
  if (!isArchived) {
    return "Not archived";
  }
  const formatted = archivedAt ? formatDate(archivedAt) : "";
  return formatted ? formatted : "Archived (no date on file)";
}
