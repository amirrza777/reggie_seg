import Link from "next/link";
import { isModuleArchivedFromApi } from "../moduleArchiveState";

type Props = {
  moduleArchivedAt?: string | null;
  projectArchivedAt?: string | null;
  audience: "staff" | "student";
  projectId?: string;
};

function isProjectArchivedFromApi(archivedAt: string | null | undefined): boolean {
  return archivedAt != null && archivedAt !== "";
}

/**
 * Shown on project and nested team routes when the parent module and/or the project is archived.
 * Discussion forum remains editable; other tools follow archive rules.
 */
export function ArchivedProjectScopeBanner({ moduleArchivedAt, projectArchivedAt, audience, projectId }: Props) {
  const moduleArchived = isModuleArchivedFromApi({ archivedAt: moduleArchivedAt ?? undefined });
  const projectArchived = isProjectArchivedFromApi(projectArchivedAt);

  if (!moduleArchived && !projectArchived) {
    return null;
  }

  if (moduleArchived && projectArchived) {
    return (
      <div className="status-alert status-alert--success" role="status">
        <span>
          This module and project are archived. The workspace is read-only, except for the discussion forum which remains open.{" "}
          {audience === "staff" ? (
            <>
              <Link href="/staff/archive" className="ui-link">
                <strong>Unarchive the module</strong>
              </Link>{" "}
              to restore edits elsewhere, or{" "}
              {projectId ? (
                <>
                  <Link href={`/staff/projects/${encodeURIComponent(projectId)}/manage`} className="ui-link">
                    <strong>manage the project</strong>
                  </Link>{" "}
                  if you need to unarchive the project after the module is active again.
                </>
              ) : (
                "use manage project if you need to unarchive the project after the module is active again."
              )}
            </>
          ) : null}
        </span>
      </div>
    );
  }

  if (moduleArchived) {
    return (
      <div className="status-alert status-alert--success" role="status">
        <span>
          This module is archived. This project is read-only, except for the discussion forum which remains open.{" "}
          {audience === "staff" ? (
            <>
              <Link href="/staff/archive" className="ui-link">
                <strong>Unarchive the module</strong>
              </Link>{" "}
              to restore edits elsewhere.
            </>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <div className="status-alert status-alert--success" role="status">
      <span>
        This project is archived. This workspace is read-only, except for the discussion forum which remains open.{" "}
        {audience === "staff" && projectId ? (
          <>
            <Link href={`/staff/projects/${encodeURIComponent(projectId)}/manage`} className="ui-link">
              <strong>Manage project</strong>
            </Link>{" "}
            to unarchive or change settings.
          </>
        ) : null}
      </span>
    </div>
  );
}
