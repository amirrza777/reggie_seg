import type { Project } from "../types";

function taskOpenSortKey(project: Project): number {
  const raw = project.taskOpenDate;
  if (raw == null || raw === "") return Number.POSITIVE_INFINITY;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

/** Earliest open first > projects without a date last > then by name. */
export function sortProjectsByTaskOpenDate(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) =>
      taskOpenSortKey(a) - taskOpenSortKey(b) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
