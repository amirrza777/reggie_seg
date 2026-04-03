import Link from "next/link";
import { isModuleArchivedFromApi } from "../moduleArchiveState";

type Props = {
  moduleArchivedAt?: string | null;
  audience: "staff" | "student";
};

/**
 * Shown on project (and nested team) pages when the parent module is archived.
 * Discussion forum remains editable; other tools are read-only.
 */
export function ArchivedModuleProjectScopeBanner({ moduleArchivedAt, audience }: Props) {
  if (!isModuleArchivedFromApi({ archivedAt: moduleArchivedAt ?? undefined })) {
    return null;
  }

  return (
    <div className="status-alert status-alert--success" role="status">
      <span>
        This module is archived. This project is read-only except the discussion forum, which stays open.{" "}
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
