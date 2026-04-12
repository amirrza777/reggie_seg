"use client";

import type { FormEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStaffProjectManage, patchStaffProjectManage } from "@/features/projects/api/client";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { ApiError } from "@/shared/api/errors";

export const PROJECT_NAME_MAX_LENGTH = 200;

export type StaffProjectManageSetupContextValue = {
  projectId: number;
  initial: StaffProjectManageSummary;
  name: string;
  setName: (value: string) => void;
  savedName: string;
  nameTrimmed: string;
  nameError: string | null;
  detailsDisabled: boolean;
  isArchived: boolean;
  moduleArchived: boolean;
  isSaving: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  busy: string | null;
  scopeDisabled: boolean;
  detailsSuccess: string | null;
  detailsError: string | null;
  archiveSuccess: string | null;
  archiveError: string | null;
  deleteError: string | null;
  confirmArchiveProject: boolean;
  setConfirmArchiveProject: (value: boolean) => void;
  confirmUnarchiveProject: boolean;
  setConfirmUnarchiveProject: (value: boolean) => void;
  confirmDeleteProject: boolean;
  setConfirmDeleteProject: (value: boolean) => void;
  handleSubmitName: (event: FormEvent) => void;
  handleArchiveProject: () => void;
  handleUnarchiveProject: () => void;
  handleDeleteProject: () => void;
};

const StaffProjectManageSetupContext = createContext<StaffProjectManageSetupContextValue | null>(null);

type StaffProjectManageSetupProviderProps = {
  projectId: number;
  initial: StaffProjectManageSummary;
  children: ReactNode;
};

export function StaffProjectManageSetupProvider({ projectId, initial, children }: StaffProjectManageSetupProviderProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [savedName, setSavedName] = useState(initial.name);
  const [archivedAt, setArchivedAt] = useState(initial.archivedAt);
  const [moduleArchivedAt, setModuleArchivedAt] = useState(initial.moduleArchivedAt);
  const [confirmArchiveProject, setConfirmArchiveProject] = useState(false);
  const [confirmUnarchiveProject, setConfirmUnarchiveProject] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isArchived = Boolean(archivedAt);
  const moduleArchived = Boolean(moduleArchivedAt);
  const detailsDisabled = isArchived || moduleArchived;
  const nameTrimmed = name.trim();
  const nameOverLimit = nameTrimmed.length > PROJECT_NAME_MAX_LENGTH;
  const nameError =
    nameTrimmed.length === 0
      ? "Project name is required"
      : nameOverLimit
        ? `Use at most ${PROJECT_NAME_MAX_LENGTH} characters`
        : null;

  const isSaving = busy === "save";
  const isArchiving = busy === "archive" || busy === "unarchive";
  const isDeleting = busy === "delete";
  const scopeDisabled = Boolean(busy);

  useEffect(() => {
    setName(initial.name);
    setSavedName(initial.name);
    setArchivedAt(initial.archivedAt);
    setModuleArchivedAt(initial.moduleArchivedAt);
  }, [initial.name, initial.archivedAt, initial.moduleArchivedAt]);

  const applySummary = useCallback((s: StaffProjectManageSummary) => {
    setName(s.name);
    setSavedName(s.name);
    setArchivedAt(s.archivedAt);
    setModuleArchivedAt(s.moduleArchivedAt);
  }, []);

  const clearAllFeedback = useCallback(() => {
    setDetailsSuccess(null);
    setDetailsError(null);
    setArchiveSuccess(null);
    setArchiveError(null);
    setDeleteError(null);
  }, []);

  const run = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      setBusy(key);
      clearAllFeedback();
      try {
        await fn();
      } catch (e: unknown) {
        const msg = e instanceof ApiError ? e.message : "Something went wrong";
        if (key === "delete") {
          setDeleteError(msg);
        } else {
          setArchiveError(msg);
        }
      } finally {
        setBusy(null);
      }
    },
    [clearAllFeedback],
  );

  const saveNameInternal = useCallback(async () => {
    if (detailsDisabled || nameError || nameTrimmed === savedName.trim()) return;
    setBusy("save");
    clearAllFeedback();
    try {
      const updated = await patchStaffProjectManage(projectId, { name: nameTrimmed });
      applySummary(updated);
      setDetailsSuccess("Project name saved.");
      router.refresh();
    } catch (e: unknown) {
      setDetailsError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }, [applySummary, clearAllFeedback, detailsDisabled, nameError, nameTrimmed, projectId, router, savedName]);

  const handleSubmitName = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void saveNameInternal();
    },
    [saveNameInternal],
  );

  const handleArchiveProject = useCallback(() => {
    void run("archive", async () => {
      const updated = await patchStaffProjectManage(projectId, { archived: true });
      applySummary(updated);
      setConfirmArchiveProject(false);
      setArchiveSuccess("Project archived.");
      router.refresh();
    });
  }, [applySummary, projectId, router, run]);

  const handleUnarchiveProject = useCallback(() => {
    void run("unarchive", async () => {
      const updated = await patchStaffProjectManage(projectId, { archived: false });
      applySummary(updated);
      setConfirmUnarchiveProject(false);
      setArchiveSuccess("Project unarchived.");
      router.refresh();
    });
  }, [applySummary, projectId, router, run]);

  const handleDeleteProject = useCallback(() => {
    void run("delete", async () => {
      const { moduleId } = await deleteStaffProjectManage(projectId);
      router.replace(`/staff/modules/${encodeURIComponent(String(moduleId))}`);
      router.refresh();
    });
  }, [projectId, router, run]);

  const value = useMemo<StaffProjectManageSetupContextValue>(
    () => ({
      projectId,
      initial,
      name,
      setName,
      savedName,
      nameTrimmed,
      nameError,
      detailsDisabled,
      isArchived,
      moduleArchived,
      isSaving,
      isArchiving,
      isDeleting,
      busy,
      scopeDisabled,
      detailsSuccess,
      detailsError,
      archiveSuccess,
      archiveError,
      deleteError,
      confirmArchiveProject,
      setConfirmArchiveProject,
      confirmUnarchiveProject,
      setConfirmUnarchiveProject,
      confirmDeleteProject,
      setConfirmDeleteProject,
      handleSubmitName,
      handleArchiveProject,
      handleUnarchiveProject,
      handleDeleteProject,
    }),
    [
      projectId,
      initial,
      name,
      savedName,
      nameTrimmed,
      nameError,
      detailsDisabled,
      isArchived,
      moduleArchived,
      isSaving,
      isArchiving,
      isDeleting,
      busy,
      scopeDisabled,
      detailsSuccess,
      detailsError,
      archiveSuccess,
      archiveError,
      deleteError,
      confirmArchiveProject,
      confirmUnarchiveProject,
      confirmDeleteProject,
      handleSubmitName,
      handleArchiveProject,
      handleUnarchiveProject,
      handleDeleteProject,
    ],
  );

  return <StaffProjectManageSetupContext.Provider value={value}>{children}</StaffProjectManageSetupContext.Provider>;
}

export function useStaffProjectManageSetup(): StaffProjectManageSetupContextValue {
  const ctx = useContext(StaffProjectManageSetupContext);
  if (!ctx) {
    throw new Error("useStaffProjectManageSetup must be used within StaffProjectManageSetupProvider");
  }
  return ctx;
}
