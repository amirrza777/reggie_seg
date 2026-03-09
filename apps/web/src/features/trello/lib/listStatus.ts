/** Maps list names to backlog / in progress / completed (or information-only). */
export type ListStatus = "backlog" | "inProgress" | "completed" | null;

export const SECTION_STATUS_LABELS: Record<string, string> = {
  information_only: "Information only",
  backlog: "Backlog",
  work_in_progress: "Work in progress",
  completed: "Completed",
};

const CONFIG_STATUS: Record<string, ListStatus> = {
  information_only: null,
  backlog: "backlog",
  work_in_progress: "inProgress",
  "work in progress": "inProgress",
  completed: "completed",
};

export function getListStatus(
  listName: string,
  sectionConfig?: Record<string, string> | null
): ListStatus {
  if (sectionConfig?.[listName]) {
    const v = sectionConfig[listName].toLowerCase().replace(/\s+/g, "_");
    if (CONFIG_STATUS[v] !== undefined) return CONFIG_STATUS[v];
  }
  const lower = listName.toLowerCase();
  return lower === "backlog" ? "backlog" : lower === "completed" ? "completed" : "inProgress";
}
