import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import type { Module } from "@/features/modules/types";

/** “Module summary & expectations” — module name + four guidance text areas. */
export type ModuleGuidanceDefaults = {
  moduleName: string;
  briefText: string;
  timelineText: string;
  expectationsText: string;
  readinessNotesText: string;
};

const str = (v: unknown) => (typeof v === "string" ? v : v != null ? String(v) : "");

export function guidanceDefaultsFromAccessSelection(
  selection: EnterpriseModuleAccessSelectionResponse,
): ModuleGuidanceDefaults {
  const m = selection.module;
  return {
    moduleName: str(m.name),
    briefText: str(m.briefText),
    timelineText: str(m.timelineText),
    expectationsText: str(m.expectationsText),
    readinessNotesText: str(m.readinessNotesText),
  };
}

export type StaffModuleGuidanceRow = Pick<
  Module,
  "title" | "briefText" | "timelineText" | "expectationsText" | "readinessNotesText"
>;


export function mergeGuidanceDefaultsWithStaffRow(
  defaults: ModuleGuidanceDefaults,
  row: StaffModuleGuidanceRow | null | undefined,
): ModuleGuidanceDefaults {
  if (!row) return defaults;
  const useList = (api: string, list: string | undefined) => (api.trim().length > 0 ? api : (list ?? ""));
  return {
    moduleName: defaults.moduleName.trim().length > 0 ? defaults.moduleName : (row.title ?? defaults.moduleName),
    briefText: useList(defaults.briefText, row.briefText),
    timelineText: useList(defaults.timelineText, row.timelineText),
    expectationsText: useList(defaults.expectationsText, row.expectationsText),
    readinessNotesText: useList(defaults.readinessNotesText, row.readinessNotesText),
  };
}

export function moduleGuidanceApplyToken(selection: EnterpriseModuleAccessSelectionResponse): string {
  const m = selection.module;
  return `${m.id}\u001f${m.updatedAt}`;
}

export function guidanceDefaultsSignature(g: ModuleGuidanceDefaults): string {
  return [g.moduleName, g.briefText, g.timelineText, g.expectationsText, g.readinessNotesText].join("\u0000");
}
