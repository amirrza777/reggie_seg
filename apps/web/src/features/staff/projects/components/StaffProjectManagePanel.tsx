"use client";

import Link from "next/link";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CharacterCount } from "@/features/enterprise/components/EnterpriseModuleFormFields";
import {
  deleteStaffProjectManage,
  patchStaffProjectManage,
} from "@/features/projects/api/client";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

const PROJECT_NAME_MAX_LENGTH = 200;

const fieldsetResetStyle: CSSProperties = { border: "none", margin: 0, padding: 0, minWidth: 0 };

type StaffProjectManagePanelProps = {
  projectId: number;
  initial: StaffProjectManageSummary;
  overviewHref: string;
};

export function StaffProjectManagePanel({ projectId, initial, overviewHref }: StaffProjectManagePanelProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [savedName, setSavedName] = useState(initial.name);
  const [archivedAt, setArchivedAt] = useState(initial.archivedAt);
  const [moduleArchivedAt, setModuleArchivedAt] = useState(initial.moduleArchivedAt);
  const [confirmArchiveProject, setConfirmArchiveProject] = useState(false);
  const [confirmUnarchiveProject, setConfirmUnarchiveProject] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [archiveActionNotice, setArchiveActionNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isArchived = Boolean(archivedAt);
  const moduleArchived = Boolean(moduleArchivedAt);
  const readOnlyArchived = moduleArchived;
  const detailsDisabled = isArchived || moduleArchived;
  const nameTrimmed = name.trim();
  const nameOverLimit = nameTrimmed.length > PROJECT_NAME_MAX_LENGTH;
  const nameError =
    nameTrimmed.length === 0 ? "Project name is required" : nameOverLimit ? `Use at most ${PROJECT_NAME_MAX_LENGTH} characters` : null;

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

  const run = useCallback(async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErrorMessage(null);
    setArchiveActionNotice(null);
    try {
      await fn();
    } catch (e: unknown) {
      setErrorMessage(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }, []);

  const handleSaveName = useCallback(() => {
    if (detailsDisabled || nameError || nameTrimmed === savedName.trim()) return;
    void run("save", async () => {
      const updated = await patchStaffProjectManage(projectId, { name: nameTrimmed });
      applySummary(updated);
      setArchiveActionNotice("Project name saved.");
      router.refresh();
    });
  }, [
    applySummary,
    detailsDisabled,
    nameError,
    nameTrimmed,
    projectId,
    router,
    run,
    savedName,
  ]);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void handleSaveName();
    },
    [handleSaveName],
  );

  const handleArchiveProject = () =>
    run("archive", async () => {
      const updated = await patchStaffProjectManage(projectId, { archived: true });
      applySummary(updated);
      setConfirmArchiveProject(false);
      setArchiveActionNotice("Project archived.");
      router.refresh();
    });

  const handleUnarchiveProject = () =>
    run("unarchive", async () => {
      const updated = await patchStaffProjectManage(projectId, { archived: false });
      applySummary(updated);
      setConfirmUnarchiveProject(false);
      setArchiveActionNotice("Project unarchived.");
      router.refresh();
    });

  const handleDeleteProject = () =>
    run("delete", async () => {
      const { moduleId } = await deleteStaffProjectManage(projectId);
      router.replace(`/staff/modules/${encodeURIComponent(String(moduleId))}`);
      router.refresh();
    });

  return (
    <form className="enterprise-modules__create-form enterprise-module-create__form" onSubmit={handleSubmit} noValidate>
      <ProjectManageFormCollapsible title="Project details" defaultOpen={!detailsDisabled}>
        <fieldset disabled={detailsDisabled} style={fieldsetResetStyle}>
          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
            <label htmlFor="project-name-input" className="enterprise-modules__create-field-label">
              Project name
            </label>
            <p className="ui-note ui-note--muted">
              {detailsDisabled
                ? isArchived
                  ? "Unarchive this project to rename it (unless the parent module is archived)."
                  : "The parent module is archived; unarchive the module to edit this project."
                : "This name appears in the staff workspace and student-facing areas that reference the project."}
            </p>
            <FormField
              id="project-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              aria-label="Project name"
              aria-invalid={nameError ? true : undefined}
              disabled={detailsDisabled || isSaving}
            />
            {nameError ? <span className="enterprise-module-create__field-error">{nameError}</span> : null}
            <CharacterCount value={name} limit={PROJECT_NAME_MAX_LENGTH} />
          </div>
        </fieldset>
      </ProjectManageFormCollapsible>

      <ProjectManageFormCollapsible title="Archive or delete project" defaultOpen={detailsDisabled}>
        {moduleArchived ? (
          <div className="enterprise-modules__create-field enterprise-module-create__field">
            <p className="ui-note ui-note--muted">
              This module is archived. Unarchive the module from{" "}
              <Link href={`/staff/modules/${encodeURIComponent(String(initial.moduleId))}/manage`} className="ui-link">
                <strong>manage module</strong>
              </Link>{" "}
              before you can archive or unarchive this project.
            </p>
          </div>
        ) : null}

        {!moduleArchived ? (
          isArchived ? (
            <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
              <div className="enterprise-module-create__danger-zone">
                <h3 className="enterprise-module-create__danger-title">Unarchive project</h3>
                <p className="ui-note">
                  This project is archived: many edits and workflows are blocked. Unarchive to allow changes again.
                </p>
                <label htmlFor="project-unarchive-confirmation" className="enterprise-module-create__danger-confirm">
                  <input
                    id="project-unarchive-confirmation"
                    type="checkbox"
                    checked={confirmUnarchiveProject}
                    onChange={(event) => setConfirmUnarchiveProject(event.target.checked)}
                    disabled={scopeDisabled}
                  />
                  <span>I understand this will allow people with permission to edit this project again.</span>
                </label>
                <div className="ui-row ui-row--end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void handleUnarchiveProject()}
                    disabled={scopeDisabled || !confirmUnarchiveProject}
                  >
                    {isArchiving && busy === "unarchive" ? "Updating…" : "Unarchive project"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
              <div className="enterprise-module-create__danger-zone">
                <h3 className="enterprise-module-create__danger-title">Archive project</h3>
                <p className="ui-note">
                  Archive the project to pause activity and block edits until you unarchive it (for example at the end of
                  the assignment).
                </p>
                <label htmlFor="project-archive-confirmation" className="enterprise-module-create__danger-confirm">
                  <input
                    id="project-archive-confirmation"
                    type="checkbox"
                    checked={confirmArchiveProject}
                    onChange={(event) => setConfirmArchiveProject(event.target.checked)}
                    disabled={scopeDisabled}
                  />
                  <span>I understand the project will become read-only for most actions until it is unarchived.</span>
                </label>
                <div className="ui-row ui-row--end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleArchiveProject()}
                    disabled={scopeDisabled || !confirmArchiveProject}
                  >
                    {isArchiving && busy === "archive" ? "Updating…" : "Archive project"}
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : null}

        <div
          className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger"
          style={{ marginTop: 16 }}
        >
          <div className="enterprise-module-create__danger-zone">
            <h3 className="enterprise-module-create__danger-title">Delete project</h3>
            <p className="ui-note">
              This permanently deletes the project and its related teams and data for this project.
            </p>
            <label htmlFor="project-delete-confirmation" className="enterprise-module-create__danger-confirm">
              <input
                id="project-delete-confirmation"
                type="checkbox"
                checked={confirmDeleteProject}
                onChange={(event) => setConfirmDeleteProject(event.target.checked)}
                disabled={scopeDisabled}
              />
              <span>I understand this action cannot be undone.</span>
            </label>
            <div className="ui-row ui-row--end">
              <Button
                type="button"
                variant="danger"
                onClick={() => void handleDeleteProject()}
                disabled={scopeDisabled || !confirmDeleteProject}
              >
                {isDeleting ? "Deleting..." : "Delete project"}
              </Button>
            </div>
          </div>
        </div>
      </ProjectManageFormCollapsible>

      <ProjectArchiveActionNotice message={archiveActionNotice} />
      <ProjectErrorMessage errorMessage={errorMessage} />

      {readOnlyArchived ? (
        <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={scopeDisabled}
            onClick={() => router.push(overviewHref)}
          >
            Back
          </Button>
        </div>
      ) : (
        <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={scopeDisabled}
            onClick={() => router.push(overviewHref)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              scopeDisabled ||
              Boolean(nameError) ||
              nameTrimmed === savedName.trim() ||
              detailsDisabled
            }
          >
            {isSaving ? "Saving..." : "Save project"}
          </Button>
        </div>
      )}
    </form>
  );
}

function ProjectManageFormCollapsible({
  title,
  summaryHint,
  defaultOpen = false,
  children,
}: {
  title: string;
  summaryHint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);
  return (
    <details
      className="enterprise-module-create__collapsible"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="enterprise-module-create__collapsible-summary">
        <span className="enterprise-module-create__collapsible-summary-text">
          <span className="enterprise-module-create__collapsible-title">{title}</span>
          {summaryHint ? (
            <span className="enterprise-module-create__collapsible-hint muted">{summaryHint}</span>
          ) : null}
        </span>
      </summary>
      <div className="enterprise-module-create__collapsible-body">{children}</div>
    </details>
  );
}

function ProjectArchiveActionNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="status-alert status-alert--success enterprise-module-create__archive-notice" role="status">
      <span>{message}</span>
    </div>
  );
}

function ProjectErrorMessage({ errorMessage }: { errorMessage: string | null }) {
  if (!errorMessage) return null;
  return (
    <div className="status-alert status-alert--error enterprise-module-create__error">
      <span>{errorMessage}</span>
    </div>
  );
}
