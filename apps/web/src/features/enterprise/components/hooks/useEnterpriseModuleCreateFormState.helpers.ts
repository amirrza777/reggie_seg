import type { getEnterpriseModuleAccessSelection } from "../../api/client";

export type ModuleSelectionResponse = Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>;

export type ModuleUpdatePayload = {
  name: string;
  code?: string;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
};

export function includeId(values: number[], id: number): number[] {
  if (values.includes(id)) {
    return values;
  }
  return [...values, id];
}

export function applyModuleSelection(
  selection: ModuleSelectionResponse,
  setters: {
    setModuleName: (value: string) => void;
    setModuleCode: (value: string) => void;
    setBriefText: (value: string) => void;
    setTimelineText: (value: string) => void;
    setExpectationsText: (value: string) => void;
    setReadinessNotesText: (value: string) => void;
    setLeaderIds: (value: number[]) => void;
    setTaIds: (value: number[]) => void;
    setStudentIds: (value: number[]) => void;
  }
) {
  setters.setModuleName(selection.module.name ?? "");
  setters.setModuleCode(selection.module.code ?? "");
  setters.setBriefText(selection.module.briefText ?? "");
  setters.setTimelineText(selection.module.timelineText ?? "");
  setters.setExpectationsText(selection.module.expectationsText ?? "");
  setters.setReadinessNotesText(selection.module.readinessNotesText ?? "");
  setters.setLeaderIds(selection.leaderIds);
  setters.setTaIds(selection.taIds);
  setters.setStudentIds(selection.studentIds);
}

export function validateModuleSubmit(params: {
  isEditMode: boolean;
  name: string;
  leaderIds: number[];
}): { moduleNameError: string | null; formError: string | null } {
  if (!params.name) {
    return { moduleNameError: "Module name is required.", formError: null };
  }

  if (!params.isEditMode && params.leaderIds.length === 0) {
    return {
      moduleNameError: null,
      formError: "Select at least one module leader before creating the module.",
    };
  }

  return { moduleNameError: null, formError: null };
}

export function buildModuleUpdatePayload(input: {
  name: string;
  code: string;
  briefText: string;
  timelineText: string;
  expectationsText: string;
  readinessNotesText: string;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
}): ModuleUpdatePayload {
  return {
    name: input.name,
    code: normalizeOptionalModuleCode(input.code),
    briefText: normalizeOptionalMultilineText(input.briefText),
    timelineText: normalizeOptionalMultilineText(input.timelineText),
    expectationsText: normalizeOptionalMultilineText(input.expectationsText),
    readinessNotesText: normalizeOptionalMultilineText(input.readinessNotesText),
    leaderIds: input.leaderIds,
    taIds: input.taIds,
    studentIds: input.studentIds,
  };
}

export function normalizeOptionalModuleCode(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

export function resolveCreatedModuleHref(workspace: "enterprise" | "staff", moduleId: number): string {
  const basePath = workspace === "staff" ? `/staff/modules/${moduleId}/manage` : `/enterprise/modules/${moduleId}/edit`;
  const searchParams = new URLSearchParams({ created: "1" });
  return `${basePath}?${searchParams.toString()}`;
}

export function normalizeOptionalMultilineText(value: string): string | undefined {
  const normalized = value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  return normalized ? normalized : undefined;
}

export function resolveModuleActionError(
  error: unknown,
  action: "load" | "create" | "update" | "delete" | "archive" | "unarchive",
): string {
  if (error instanceof Error && error.message === "Forbidden") {
    return "Only module owners/leaders can edit this module.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (action === "load") {
    return "Could not load module access options.";
  }
  return `Could not ${action} module.`;
}
