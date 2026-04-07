import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffProjectManagePanel } from "@/features/staff/projects/components/StaffProjectManagePanel";
import { getStaffProjectManage } from "@/features/projects/api/client";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import { Card } from "@/shared/ui/Card";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectManagePageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectManagePage({ params }: StaffProjectManagePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isStaff && user.role !== "ADMIN") redirect("/dashboard");

  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
    redirect("/staff/modules");
  }

  let summary;
  try {
    summary = await getStaffProjectManage(numericProjectId);
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      redirect(`/staff/projects/${encodeURIComponent(projectId)}`);
    }
    if (e instanceof ApiError && e.status === 404) {
      redirect("/staff/modules");
    }
    throw e;
  }

  const overviewHref = `/staff/projects/${encodeURIComponent(projectId)}`;
  const moduleArchived = Boolean(summary.moduleArchivedAt);
  const projectArchived = Boolean(summary.archivedAt);

  const description = moduleArchived
    ? 'This module is archived and this project is read-only. To make changes, unarchive the module from its manage page, or use "Archive or delete project" below to remove this project.'
    : projectArchived
      ? 'This project is archived: the name field and most workflows are read-only. Use "Archive or delete project" below to unarchive it, or delete it if it is no longer needed.'
      : "Rename this project, archive it to pause activity, or delete it when it is no longer needed.";

  return (
    <div className="ui-page enterprise-module-create-page enterprise-module-create-page--embedded">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Manage project</h1>
        <p className="ui-page__description">{description}</p>
      </header>

      <Card
        title={<span className="overview-title">Project setup</span>}
        action={
          <Link href={overviewHref} className="btn btn--ghost">
            Back to project
          </Link>
        }
        className="enterprise-module-create__card"
      >
        <StaffProjectManagePanel projectId={numericProjectId} initial={summary} overviewHref={overviewHref} />
      </Card>
    </div>
  );
}
