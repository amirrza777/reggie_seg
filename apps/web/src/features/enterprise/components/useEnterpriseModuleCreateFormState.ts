"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  updateEnterpriseModule,
} from "../api/client";
import type { ModuleGuidanceDefaults } from "@/features/modules/components/moduleSetup/moduleGuidanceDefaults";
import type { EnterpriseModuleAccessSelectionResponse } from "../types";
import { useEnterpriseModuleAccessBuckets } from "./useEnterpriseModuleAccessBuckets";

type UseEnterpriseModuleCreateFormStateParams = {
  mode: "create" | "edit";
  moduleId?: number;
  workspace: "enterprise" | "staff";
  /**
   * When editing, pass the result of `loadModuleSetupInitialSelection` from the Server Component
   * so fields hydrate from one server fetch — no duplicate client request for the same payload.
   */
  initialAccessSelection?: EnterpriseModuleAccessSelectionResponse | null;
  /**
   * After a successful update, navigate here instead of the default workspace modules list.
   */
  successRedirectHref?: string;
};

type ModuleSelectionResponse = Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>;

type ModuleUpdatePayload = {
  name: string;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
};

function stateFromAccessSelection(selection: EnterpriseModuleAccessSelectionResponse) {
  const m = selection.module;
  const str = (v: unknown) => (typeof v === "string" ? v : v != null ? String(v) : "");
  return {
    moduleName: str(m.name),
    briefText: str(m.briefText),
    timelineText: str(m.timelineText),
    expectationsText: str(m.expectationsText),
    readinessNotesText: str(m.readinessNotesText),
    leaderIds: [...selection.leaderIds],
    taIds: [...selection.taIds],
    studentIds: [...selection.studentIds],
  };
}

export function useEnterpriseModuleCreateFormState({
  mode,
  moduleId,
  workspace,
  initialAccessSelection,
  successRedirectHref,
}: UseEnterpriseModuleCreateFormStateParams) {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const modulesHomeHref =
    successRedirectHref ?? (workspace === "staff" ? "/staff/modules" : "/enterprise/modules");
  const hydratedFromServer = Boolean(initialAccessSelection);

  const seed = initialAccessSelection ? stateFromAccessSelection(initialAccessSelection) : null;

  const [moduleName, setModuleName] = useState(() => (seed ? seed.moduleName : ""));
  const [moduleNameError, setModuleNameError] = useState<string | null>(null);
  const [briefText, setBriefText] = useState(() => (seed ? seed.briefText : ""));
  const [timelineText, setTimelineText] = useState(() => (seed ? seed.timelineText : ""));
  const [expectationsText, setExpectationsText] = useState(() => (seed ? seed.expectationsText : ""));
  const [readinessNotesText, setReadinessNotesText] = useState(() => (seed ? seed.readinessNotesText : ""));

  const [leaderIds, setLeaderIds] = useState<number[]>(() => (seed ? seed.leaderIds : []));
  const [taIds, setTaIds] = useState<number[]>(() => (seed ? seed.taIds : []));
  const [studentIds, setStudentIds] = useState<number[]>(() => (seed ? seed.studentIds : []));

  const [isLoadingAccess, setIsLoadingAccess] = useState(() => (isEditMode ? !hydratedFromServer : false));
  const [canEditModule, setCanEditModule] = useState(() => (isEditMode ? hydratedFromServer : true));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState(false);

  const accessBuckets = useEnterpriseModuleAccessBuckets({
    mode,
    isEditMode,
    isLoadingAccess,
    canEditModule,
    moduleIdForAccessSearchExclude: isEditMode && moduleId != null ? moduleId : undefined,
  });

  useEffect(() => {
    let isActive = true;

    async function loadInitialSelection() {
      if (mode !== "edit") {
        setCanEditModule(true);
        setIsLoadingAccess(false);
        return;
      }

      if (hydratedFromServer) {
        return;
      }

      setIsLoadingAccess(true);
      setErrorMessage(null);
      setConfirmDeleteModule(false);
      setIsDeleting(false);
      setCanEditModule(false);

      if (!moduleId) {
        if (!isActive) return;
        setErrorMessage("Module id is required for edit mode.");
        setIsLoadingAccess(false);
        return;
      }

      try {
        const response = await getEnterpriseModuleAccessSelection(moduleId);
        if (!isActive) return;
        setCanEditModule(true);
        applyAccessSelection(response, {
          setModuleName,
          setBriefText,
          setTimelineText,
          setExpectationsText,
          setReadinessNotesText,
          setLeaderIds,
          setTaIds,
          setStudentIds,
        });
      } catch (err) {
        if (!isActive) return;
        setCanEditModule(false);
        setErrorMessage(resolveModuleActionError(err, "load"));
      } finally {
        if (isActive) {
          setIsLoadingAccess(false);
        }
      }
    }

    void loadInitialSelection();

    return () => {
      isActive = false;
    };
  }, [mode, moduleId, hydratedFromServer]);

  const leaderSet = useMemo(() => new Set(leaderIds), [leaderIds]);
  const taSet = useMemo(() => new Set(taIds), [taIds]);
  const studentSet = useMemo(() => new Set(studentIds), [studentIds]);

  const handleModuleNameChange = (value: string) => {
    setModuleName(value);
    if (moduleNameError && value.trim()) {
      setModuleNameError(null);
    }
  };

  /** Used by {@link ModuleGuidanceSection} to apply server `defaultGuidance` into controlled fields. */
  const applyGuidanceDefaults = useCallback((g: ModuleGuidanceDefaults) => {
    setModuleName(g.moduleName);
    setBriefText(g.briefText);
    setTimelineText(g.timelineText);
    setExpectationsText(g.expectationsText);
    setReadinessNotesText(g.readinessNotesText);
  }, []);

  const performSubmit = useCallback(async () => {
    const name = moduleName.trim();
    const validation = validateModuleSubmit({ isEditMode, name, leaderIds });
    if (validation.moduleNameError) {
      setModuleNameError(validation.moduleNameError);
      return;
    }
    if (validation.formError) {
      setErrorMessage(validation.formError);
      return;
    }

    setModuleNameError(null);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditMode) {
        if (!moduleId) throw new Error("Module id is required for edit mode.");
        const payload = buildModuleUpdatePayload({
          name,
          briefText,
          timelineText,
          expectationsText,
          readinessNotesText,
          leaderIds,
          taIds,
          studentIds,
        });
        await updateEnterpriseModule(moduleId, payload);
        router.push(modulesHomeHref);
      } else {
        const createdModule = await createEnterpriseModule({ name, leaderIds });
        const nextHref = resolveCreatedModuleHref(workspace, createdModule.id);
        router.push(nextHref);
      }

      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, isEditMode ? "update" : "create"));
      setIsSubmitting(false);
    }
  }, [
    briefText,
    expectationsText,
    isEditMode,
    leaderIds,
    moduleId,
    moduleName,
    modulesHomeHref,
    readinessNotesText,
    router,
    studentIds,
    taIds,
    timelineText,
    workspace,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performSubmit();
  };

  const handleDeleteModule = async () => {
    if (mode !== "edit") return;
    if (!moduleId) {
      setErrorMessage("Module id is required for edit mode.");
      return;
    }
    if (!confirmDeleteModule) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteEnterpriseModule(moduleId);
      router.push(modulesHomeHref);
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, "delete"));
      setIsDeleting(false);
    }
  };

  const toggleLeader = (userId: number, checked: boolean) => {
    setLeaderIds((prev) => (checked ? includeId(prev, userId) : prev.filter((id) => id !== userId)));
    if (checked) {
      setTaIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const toggleTeachingAssistant = (userId: number, checked: boolean) => {
    setTaIds((prev) => (checked ? includeId(prev, userId) : prev.filter((id) => id !== userId)));
  };

  const toggleStudent = (userId: number, checked: boolean) => {
    setStudentIds((prev) => (checked ? includeId(prev, userId) : prev.filter((id) => id !== userId)));
  };

  const navigateHome = () => {
    router.push(modulesHomeHref);
  };

  return {
    isEditMode,
    moduleId,
    moduleName,
    moduleNameError,
    briefText,
    timelineText,
    expectationsText,
    readinessNotesText,
    leaderIds,
    taIds,
    studentIds,
    isLoadingAccess,
    canEditModule,
    errorMessage,
    isSubmitting,
    isDeleting,
    confirmDeleteModule,
    leaderSet,
    taSet,
    studentSet,
    setBriefText,
    setTimelineText,
    setExpectationsText,
    setReadinessNotesText,
    setConfirmDeleteModule,
    handleModuleNameChange,
    applyGuidanceDefaults,
    handleSubmit,
    performSubmit,
    handleDeleteModule,
    toggleLeader,
    toggleTeachingAssistant,
    toggleStudent,
    navigateHome,
    ...accessBuckets,
  };
}

/** Shared shape for module setup UI sections (guidance, staff access, student access). */
export type ModuleSetupFormState = ReturnType<typeof useEnterpriseModuleCreateFormState>;

function includeId(values: number[], id: number): number[] {
  if (values.includes(id)) return values;
  return [...values, id];
}

function applyAccessSelection(
  selection: ModuleSelectionResponse,
  setters: {
    setModuleName: (value: string) => void;
    setBriefText: (value: string) => void;
    setTimelineText: (value: string) => void;
    setExpectationsText: (value: string) => void;
    setReadinessNotesText: (value: string) => void;
    setLeaderIds: (value: number[]) => void;
    setTaIds: (value: number[]) => void;
    setStudentIds: (value: number[]) => void;
  },
) {
  const m = selection.module;
  const str = (v: unknown) => (typeof v === "string" ? v : v != null ? String(v) : "");
  setters.setModuleName(str(m.name));
  setters.setBriefText(str(m.briefText));
  setters.setTimelineText(str(m.timelineText));
  setters.setExpectationsText(str(m.expectationsText));
  setters.setReadinessNotesText(str(m.readinessNotesText));
  setters.setLeaderIds([...selection.leaderIds]);
  setters.setTaIds([...selection.taIds]);
  setters.setStudentIds([...selection.studentIds]);
}

function validateModuleSubmit(params: {
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

function buildModuleUpdatePayload(input: {
  name: string;
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
    briefText: normalizeOptionalMultilineText(input.briefText),
    timelineText: normalizeOptionalMultilineText(input.timelineText),
    expectationsText: normalizeOptionalMultilineText(input.expectationsText),
    readinessNotesText: normalizeOptionalMultilineText(input.readinessNotesText),
    leaderIds: input.leaderIds,
    taIds: input.taIds,
    studentIds: input.studentIds,
  };
}

function resolveCreatedModuleHref(workspace: "enterprise" | "staff", moduleId: number): string {
  if (workspace === "staff") return `/staff/modules/${moduleId}/manage`;
  return `/enterprise/modules/${moduleId}/edit`;
}

function normalizeOptionalMultilineText(value: string): string | undefined {
  const normalized = value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  return normalized ? normalized : undefined;
}

function resolveModuleActionError(error: unknown, action: "load" | "create" | "update" | "delete"): string {
  if (error instanceof Error && error.message === "Forbidden") {
    return "Only module owners/leaders can edit this module.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (action === "load") return "Could not load module access options.";
  return `Could not ${action} module.`;
}
