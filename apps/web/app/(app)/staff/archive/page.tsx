import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import { ArchiveManager } from "@/features/archive/components/ArchiveManager";
import "../../../styles/archive.css";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !isAdmin(user))) redirect("/dashboard");

  return (
    <div className="staff-projects" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Archive Management</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Archive modules, projects and teams at the end of a semester. Archived items are read-only for all users.
        </p>
      </div>
      <div className="card" style={{ padding: "8px 0" }}>
        <ArchiveManager />
      </div>
    </div>
  );
}
