"use client";

import Link from "next/link";
import { StaffProjectManageDangerZone } from "../StaffProjectManageDangerZone";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { StaffProjectManageSectionAlerts } from "../StaffProjectManageSectionAlerts";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

export function StaffProjectManageArchiveOrDeleteSection() {
  const {
    initial,
    isArchived,
    moduleArchived,
    detailsDisabled,
    isArchiving,
    isDeleting,
    busy,
    scopeDisabled,
    archiveSuccess,
    archiveError,
    deleteError,
    confirmArchiveProject,
    setConfirmArchiveProject,
    confirmUnarchiveProject,
    setConfirmUnarchiveProject,
    confirmDeleteProject,
    setConfirmDeleteProject,
    handleArchiveProject,
    handleUnarchiveProject,
    handleDeleteProject,
  } = useStaffProjectManageSetup();

  return (
    <StaffProjectManageFormCollapsible title="Archive or delete project" defaultOpen={detailsDisabled}>
      <StaffProjectManageSectionAlerts success={archiveSuccess} error={archiveError} />
      <StaffProjectManageSectionAlerts success={null} error={deleteError} />

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
          <StaffProjectManageDangerZone
            title="Unarchive project"
            description="This project is archived and read-only for all users. Unarchive to allow changes again."
            confirmInputId="project-unarchive-confirmation"
            confirmChecked={confirmUnarchiveProject}
            onConfirmChange={setConfirmUnarchiveProject}
            confirmDisabled={scopeDisabled}
            confirmLabel="I understand this will allow people with permission to edit this project again."
            actionLabel="Unarchive project"
            actionPendingLabel="Updating…"
            isActionPending={isArchiving && busy === "unarchive"}
            onAction={handleUnarchiveProject}
            actionDisabled={scopeDisabled || !confirmUnarchiveProject}
            buttonVariant="primary"
          />
        ) : (
          <StaffProjectManageDangerZone
            title="Archive project"
            description="Archive the project to pause activity and block edits until you unarchive it (for example at the end of the assignment)."
            confirmInputId="project-archive-confirmation"
            confirmChecked={confirmArchiveProject}
            onConfirmChange={setConfirmArchiveProject}
            confirmDisabled={scopeDisabled}
            confirmLabel="I understand the project will become read-only for most actions until it is unarchived."
            actionLabel="Archive project"
            actionPendingLabel="Updating…"
            isActionPending={isArchiving && busy === "archive"}
            onAction={handleArchiveProject}
            actionDisabled={scopeDisabled || !confirmArchiveProject}
            buttonVariant="ghost"
          />
        )
      ) : null}

      <StaffProjectManageDangerZone
        className="staff-project-manage__danger-zone--spaced"
        title="Delete project"
        description="This permanently deletes the project and its related teams and data for this project."
        confirmInputId="project-delete-confirmation"
        confirmChecked={confirmDeleteProject}
        onConfirmChange={setConfirmDeleteProject}
        confirmDisabled={scopeDisabled}
        confirmLabel="I understand this action cannot be undone."
        actionLabel="Delete project"
        actionPendingLabel="Deleting..."
        isActionPending={isDeleting}
        onAction={handleDeleteProject}
        actionDisabled={scopeDisabled || !confirmDeleteProject}
        buttonVariant="danger"
      />
    </StaffProjectManageFormCollapsible>
  );
}
