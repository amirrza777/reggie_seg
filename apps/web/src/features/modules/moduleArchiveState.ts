import type { Module } from "./types";

/** True when the module is archived (read-only for mutations). */
export function isModuleArchivedFromApi(record: Pick<Module, "archivedAt"> | null | undefined): boolean {
  return record?.archivedAt != null;
}
