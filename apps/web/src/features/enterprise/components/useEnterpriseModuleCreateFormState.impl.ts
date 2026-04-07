"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { archiveItem, unarchiveItem } from "@/features/archive/api/client";
import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  updateEnterpriseModule,
} from "../api/client";
import {
  applyModuleSelection,
  buildModuleUpdatePayload,
  includeId,
  normalizeOptionalModuleCode,
  resolveCreatedModuleHref,
  resolveModuleActionError,
  validateModuleSubmit,
} from "./useEnterpriseModuleCreateFormState.helpers";
import { useEnterpriseModuleAccessBuckets } from "./useEnterpriseModuleAccessBuckets";

type UseEnterpriseModuleCreateFormStateParams = {
  mode: "create" | "edit";
  moduleId?: number;
  workspace: "enterprise" | "staff";
  successRedirectAfterUpdateHref?: string;
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
  const [isArchiving, setIsArchiving] = useState(false);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState(false);
  const [confirmArchiveModule, setConfirmArchiveModule] = useState(false);
  const [confirmUnarchiveModule, setConfirmUnarchiveModule] = useState(false);

  const [accessSearchPinLeaderIds, setAccessSearchPinLeaderIds] = useState<number[]>([]);
  const [accessSearchPinTaIds, setAccessSearchPinTaIds] = useState<number[]>([]);
  const [accessSearchPinStudentIds, setAccessSearchPinStudentIds] = useState<number[]>([]);
  const [moduleArchived, setModuleArchived] = useState(false);

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
      setConfirmArchiveModule(false);
      setConfirmUnarchiveModule(false);
      setIsDeleting(false);
      setIsArchiving(false);
      setCanEditModule(mode !== "edit");
      setAccessSearchPinLeaderIds([]);
      setAccessSearchPinTaIds([]);
      setAccessSearchPinStudentIds([]);
      setModuleArchived(false);

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
        setModuleArchived(Boolean(response.module.archivedAt));
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

  useEffect(() => {
    setConfirmArchiveModule(false);
    setConfirmUnarchiveModule(false);
  }, [moduleArchived]);

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
    if (isArchiving || isDeleting) return;
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
    if (isArchiving || isDeleting) return;
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

  const handleArchiveModule = async () => {
    if (mode !== "edit") return;
    if (moduleArchived) return;
    if (!moduleId) {
      setErrorMessage("Module id is required for edit mode.");
      return;
    }
    if (!confirmArchiveModule) return;

    setIsArchiving(true);
    setErrorMessage(null);

    try {
      await archiveItem("modules", moduleId);
      setConfirmArchiveModule(false);
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, "archive"));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchiveModule = async () => {
    if (mode !== "edit") return;
    if (!moduleArchived) return;
    if (!moduleId) {
      setErrorMessage("Module id is required for edit mode.");
      return;
    }
    if (!confirmUnarchiveModule) return;

    setIsArchiving(true);
    setErrorMessage(null);

    try {
      await unarchiveItem("modules", moduleId);
      setConfirmUnarchiveModule(false);
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, "unarchive"));
    } finally {
      setIsArchiving(false);
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
    router.push(postUpdateHref);
  };

  return {
    isEditMode,
    moduleId,
    moduleArchived,
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
    isArchiving,
    confirmDeleteModule,
    confirmArchiveModule,
    confirmUnarchiveModule,
    leaderSet,
    taSet,
    studentSet,
    setBriefText,
    setModuleCode,
    setTimelineText,
    setExpectationsText,
    setReadinessNotesText,
    setConfirmDeleteModule,
    setConfirmArchiveModule,
    setConfirmUnarchiveModule,
    handleModuleNameChange,
    handleSubmit,
    performSubmit,
    handleDeleteModule,
    handleArchiveModule,
    handleUnarchiveModule,
    toggleLeader,
    toggleTeachingAssistant,
    toggleStudent,
    navigateHome,
    ...accessBuckets,
  };
}
