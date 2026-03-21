import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import { ArchiveManager } from "@/features/archive/components/ArchiveManager";
import { Card } from "@/shared/ui/Card";
import "../../../styles/archive.css";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !isAdmin(user))) redirect("/dashboard");

  return (
    <div className="stack ui-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Archive Management</h1>
        <p className="ui-page__description">
          Archive modules, projects and teams at the end of a semester. Archived items are read-only for all users.
        </p>
      </header>
      <Card className="archive-page__card" bodyClassName="archive-page__card-body">
        <ArchiveManager />
      </Card>
    </div>
  );
}
