import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import { ArchiveManager } from "@/features/archive/components/ArchiveManager";
import { Card } from "@/shared/ui/Card";
import "../../../styles/archive.css";
import "@/features/staff/projects/styles/staff-projects.css";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !isAdmin(user))) redirect("/dashboard");

  return (
    <div className="staff-projects staff-projects--panel-inset">
      <section className="staff-projects__hero">
        <h1 className="staff-projects__title">Archive</h1>
        <p className="staff-projects__desc">
          Archive modules, projects and teams at the end of a semester. Archived items are read-only for all users.
        </p>
      </section>
      <Card className="archive-page__card" bodyClassName="archive-page__card-body">
        <ArchiveManager />
      </Card>
    </div>
  );
}
