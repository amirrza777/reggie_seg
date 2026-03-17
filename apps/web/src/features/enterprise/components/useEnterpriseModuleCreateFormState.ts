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
};

export function useEnterpriseModuleCreateFormState({
  mode,
  moduleId,
  workspace,
}: UseEnterpriseModuleCreateFormStateParams) {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const modulesHomeHref = workspace === "staff" ? "/staff/modules" : "/enterprise/modules";

  const [moduleName, setModuleName] = useState("");
  const [moduleNameError, setModuleNameError] = useState<string | null>(null);
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

  const accessBuckets = useEnterpriseModuleAccessBuckets({
    mode,
    isEditMode,
    isLoadingAccess,
    canEditModule,
  });

  useEffect(() => {
    let isActive = true;

    async function loadInitialSelection() {
      setIsLoadingAccess(true);
      setErrorMessage(null);
      setConfirmDeleteModule(false);
      setIsDeleting(false);
      setCanEditModule(mode !== "edit");

      try {
        if (mode !== "edit") {
          setCanEditModule(true);
          return;
        }

        if (!moduleId) throw new Error("Module id is required for edit mode.");

        const response = await getEnterpriseModuleAccessSelection(moduleId);
        if (!isActive) return;

        setCanEditModule(true);
        setModuleName(response.module.name ?? "");
        setBriefText(response.module.briefText ?? "");
        setTimelineText(response.module.timelineText ?? "");
        setExpectationsText(response.module.expectationsText ?? "");
        setReadinessNotesText(response.module.readinessNotesText ?? "");
        setLeaderIds(response.leaderIds);
        setTaIds(response.taIds);
        setStudentIds(response.studentIds);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = moduleName.trim();

    if (!name) {
      setModuleNameError("Module name is required.");
      return;
    }

    if (!isEditMode && leaderIds.length === 0) {
      setErrorMessage("Select at least one module leader before creating the module.");
      return;
    }

    setModuleNameError(null);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditMode) {
        if (!moduleId) throw new Error("Module id is required for edit mode.");
        await updateEnterpriseModule(moduleId, {
          name,
          briefText: normalizeOptionalMultilineText(briefText),
          timelineText: normalizeOptionalMultilineText(timelineText),
          expectationsText: normalizeOptionalMultilineText(expectationsText),
          readinessNotesText: normalizeOptionalMultilineText(readinessNotesText),
          leaderIds,
          taIds,
          studentIds,
        });
        router.push(modulesHomeHref);
      } else {
        const createdModule = await createEnterpriseModule({ name, leaderIds });
        const nextHref =
          workspace === "staff"
            ? `/staff/modules/${createdModule.id}/manage`
            : `/enterprise/modules/${createdModule.id}/edit`;
        router.push(nextHref);
      }

      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, isEditMode ? "update" : "create"));
      setIsSubmitting(false);
    }
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
    handleSubmit,
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
