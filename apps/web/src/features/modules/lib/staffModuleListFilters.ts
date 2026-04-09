import type { Module } from "../types";

export type StaffModuleArchivePartition = {
  unarchived: Module[];
  archived: Module[];
};

/** split staff modules into archived and unarchived  */
export function partitionStaffModulesByArchive(modules: Module[]): StaffModuleArchivePartition {
  const unarchived: Module[] = [];
  const archived: Module[] = [];
  for (const m of modules) {
    if (m.archivedAt != null) archived.push(m);
    else unarchived.push(m);
  }
  return { unarchived, archived };
}
