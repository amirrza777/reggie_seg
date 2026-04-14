import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEnterpriseModuleJoinCode } from "@/features/enterprise/api/client";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/module-create/EnterpriseModuleCreateForm";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { ApiError } from "@/shared/api/errors";

type StaffModuleManagePageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ created?: string; joinCode?: string }>;
};

export default async function StaffModuleManagePage({ params, searchParams }: StaffModuleManagePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isStaff && user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const parsedFromParam = Number.parseInt(moduleId, 10);
  if (!Number.isInteger(parsedFromParam) || parsedFromParam <= 0) notFound();

  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const moduleRecord = ctx.moduleRecord;
  if (!moduleRecord) redirect("/staff/modules");
  if (moduleRecord.accountRole !== "OWNER") {
    if (access.enterpriseModuleEditor) {
      redirect(`/enterprise/modules/${encodeURIComponent(moduleId)}/edit`);
    }
    redirect(`/modules/${moduleRecord.id}`);
  }

  const parsedModuleId = ctx.parsedModuleId;

  let joinCode: string | null = null;
  const joinCodeFromCreateRedirect =
    resolvedSearchParams.created === "1" && typeof resolvedSearchParams.joinCode === "string"
      ? resolvedSearchParams.joinCode.trim() || null
      : null;
  if (joinCodeFromCreateRedirect) {
    joinCode = joinCodeFromCreateRedirect;
  } else {
    try {
      joinCode = (await getEnterpriseModuleJoinCode(parsedModuleId)).joinCode;
    } catch (e) {
      if (!(e instanceof ApiError && (e.status === 403 || e.status === 404))) {
        throw e;
      }
    }
  }

  return (
    <div className="ui-page enterprise-module-create-page enterprise-module-create-page--embedded">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Manage module</h1>
        <p className="ui-page__description">
          {access.isArchived
            ? 'This module is archived and read-only. To make changes, unarchive using the "Archive or delete module" section at the bottom of this page.'
            : "Update module guidance, leads, TAs, manual student assignments, and share the module join code from the staff workspace."}
        </p>
      </header>

      <Card
        title="Module setup"
        action={!access.isArchived ? (
          <Link
            href={`/staff/projects/create?moduleId=${encodeURIComponent(String(parsedModuleId))}`}
            className="btn btn--primary"
          >
            Create project
          </Link>
        ) : null}
        className="enterprise-module-create__card"
      >
        <EnterpriseModuleCreateForm
          mode="edit"
          moduleId={parsedModuleId}
          workspace="staff"
          joinCode={joinCode}
          created={resolvedSearchParams.created === "1"}
          successRedirectAfterUpdateHref={`/staff/modules/${encodeURIComponent(moduleId)}`}
        />
      </Card>
    </div>
  );
}
