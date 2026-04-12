import Link from "next/link";

/** banner under module hero when the module is archived (staff workspace). */
export function StaffModuleWorkspaceArchivedBanner() {
  return (
    <div className="status-alert status-alert--success">
      <span>
        This module is archived and read-only. {" "}
        <Link href="/staff/archive" className="ui-link">
        <strong>Unarchive it</strong>
        </Link>{" "}
        to change module details.
      </span>
    </div>
  );
}
