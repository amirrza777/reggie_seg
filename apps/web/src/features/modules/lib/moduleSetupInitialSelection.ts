import { getEnterpriseModuleAccessSelection } from "@/features/enterprise/api/client";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import type { Module } from "../types";

/**
 * If the enterprise payload has empty guidance strings, fill from the staff module list row (same module).
 */
function mergeModuleWithStaffRow(
  module: EnterpriseModuleAccessSelectionResponse["module"],
  row: Pick<Module, "title" | "briefText" | "expectationsText" | "readinessNotesText">,
): EnterpriseModuleAccessSelectionResponse["module"] {
  const chooseValue = (api: string | undefined, list: string | undefined) =>
    api != null && api.trim().length > 0 ? api : (list ?? "");

  return {
    ...module,
    name: module.name?.trim() ? module.name : (row.title ?? module.name),
    briefText: chooseValue(module.briefText, row.briefText),
    expectationsText: chooseValue(module.expectationsText, row.expectationsText),
    readinessNotesText: chooseValue(module.readinessNotesText, row.readinessNotesText),
  };
}

/**
 * One server fetch for the module setup form: module + leader/ta/student ids.
 */
export async function loadModuleSetupInitialSelection(
  moduleId: number,
  staffModuleRow?: Pick<Module, "title" | "briefText" | "expectationsText" | "readinessNotesText"> | null,
): Promise<EnterpriseModuleAccessSelectionResponse | null> {
  try {
    const selection = await getEnterpriseModuleAccessSelection(moduleId);
    if (!staffModuleRow) {
      return selection;
    }
    return {
      ...selection,
      module: mergeModuleWithStaffRow(selection.module, staffModuleRow),
    };
  } catch {
    return null;
  }
}
