"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  updateEnterpriseModule,
} from "../api/client";
import { useEnterpriseModuleAccessBuckets } from "./useEnterpriseModuleAccessBuckets";

type UseEnterpriseModuleCreateFormStateParams = {
  mode: "create" | "edit";
  moduleId?: number;
  workspace: "enterprise" | "staff";
  successRedirectAfterUpdateHref?: string;
};

type ModuleSelectionResponse = Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>;

type ModuleUpdatePayload = {
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

export type ModuleSetupFormState = ReturnType<typeof useEnterpriseModuleCreateFormState>;

export function useEnterpriseModuleCreateFormState({
  mode,
  moduleId,
  workspace,
  successRedirectAfterUpdateHref,
}: UseEnterpriseModuleCreateFormStateParams) {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const modulesHomeHref = workspace === "staff" ? "/staff/modules" : "/enterprise/modules";
  const postUpdateHref = successRedirectAfterUpdateHref ?? modulesHomeHref;

  const [moduleName, setModuleName] = useState("");
  const [moduleNameError, setModuleNameError] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState("");
  const [briefText, setBriefText] = useState("");
  const [timelineText, setTimelineText] = useState("");
  const [expectationsText, setExpectationsText] = useState("");
  const [readinessNotesText, setReadinessNotesText] = useState("");

  const [leaderIds, setLeaderIds] = useState<number[]>([]);
  const [taIds, setTaIds] = useState<number[]>([]);
  const [studentIds, setStudentIds] = useState<number[]>([]);

  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [canEditModule, setCanEditModule] = useState(mode !== "edit");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState(false);

  const [accessSearchPinLeaderIds, setAccessSearchPinLeaderIds] = useState<number[]>([]);
  const [accessSearchPinTaIds, setAccessSearchPinTaIds] = useState<number[]>([]);
  const [accessSearchPinStudentIds, setAccessSearchPinStudentIds] = useState<number[]>([]);

  const accessBuckets = useEnterpriseModuleAccessBuckets({
    mode,
    isEditMode,
    isLoadingAccess,
    canEditModule,
    moduleIdForAccessSearchExclude: isEditMode && moduleId != null ? moduleId : undefined,
    staffPrioritiseUserIds: accessSearchPinLeaderIds,
    taPrioritiseUserIds: accessSearchPinTaIds,
    studentPrioritiseUserIds: accessSearchPinStudentIds,
  });

  useEffect(() => {
    let isActive = true;

    async function loadInitialSelection() {
      setIsLoadingAccess(true);
      setErrorMessage(null);
      setConfirmDeleteModule(false);
      setIsDeleting(false);
      setCanEditModule(mode !== "edit");
      setAccessSearchPinLeaderIds([]);
      setAccessSearchPinTaIds([]);
      setAccessSearchPinStudentIds([]);

      if (mode !== "edit") {
        if (!isActive) return;
        setCanEditModule(true);
        setIsLoadingAccess(false);
        return;
      }

      if (!moduleId) {
        if (!isActive) return;
        setCanEditModule(false);
        setErrorMessage("Module id is required for edit mode.");
        setIsLoadingAccess(false);
        return;
      }

      try {
        const response = await getEnterpriseModuleAccessSelection(moduleId);
        if (!isActive) return;
        setCanEditModule(true);
        applyModuleSelection(response, {
          setModuleName,
          setModuleCode,
          setBriefText,
          setTimelineText,
          setExpectationsText,
          setReadinessNotesText,
          setLeaderIds,
          setTaIds,
          setStudentIds,
        });
        setAccessSearchPinLeaderIds([...response.leaderIds]);
        setAccessSearchPinTaIds([...response.taIds]);
        setAccessSearchPinStudentIds([...response.studentIds]);
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
  }, [mode, moduleId]);

  const leaderSet = useMemo(() => new Set(leaderIds), [leaderIds]);
  const taSet = useMemo(() => new Set(taIds), [taIds]);
  const studentSet = useMemo(() => new Set(studentIds), [studentIds]);

  const handleModuleNameChange = (value: string) => {
    setModuleName(value);
    if (moduleNameError && value.trim()) {
      setModuleNameError(null);
    }
  };

  const submitEditModule = async () => {
    const name = moduleName.trim();
    const validation = validateModuleSubmit({ isEditMode: true, name, leaderIds });
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
      if (!moduleId) throw new Error("Module id is required for edit mode.");
      const payload = buildModuleUpdatePayload({
        name,
        code: moduleCode,
        briefText,
        timelineText,
        expectationsText,
        readinessNotesText,
        leaderIds,
        taIds,
        studentIds,
      });
      await updateEnterpriseModule(moduleId, payload);
      router.push(postUpdateHref);
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, "update"));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEditMode) {
      await submitEditModule();
      return;
    }

    const name = moduleName.trim();
    const validation = validateModuleSubmit({ isEditMode: false, name, leaderIds });
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
      const createdModule = await createEnterpriseModule({
        name,
        code: normalizeOptionalModuleCode(moduleCode),
        leaderIds,
      });
      const nextHref = resolveCreatedModuleHref(workspace, createdModule.id);
      router.push(nextHref);
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, "create"));
      setIsSubmitting(false);
    }
  };

  const performSubmit = () => submitEditModule();

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
    moduleCode,
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
    setModuleCode,
    setTimelineText,
    setExpectationsText,
    setReadinessNotesText,
    setConfirmDeleteModule,
    handleModuleNameChange,
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

function includeId(values: number[], id: number): number[] {
  if (values.includes(id)) return values;
  return [...values, id];
}

function applyModuleSelection(
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

function normalizeOptionalModuleCode(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

function resolveCreatedModuleHref(workspace: "enterprise" | "staff", moduleId: number): string {
  const basePath = workspace === "staff" ? `/staff/modules/${moduleId}/manage` : `/enterprise/modules/${moduleId}/edit`;
  const searchParams = new URLSearchParams({ created: "1" });
  return `${basePath}?${searchParams.toString()}`;
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
