import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEnterpriseModuleJoinCode } from "@/features/enterprise/api/client";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import { Card } from "@/shared/ui/Card";

type StaffModuleManagePageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ created?: string }>;
};

export default async function StaffModuleManagePage({ params, searchParams }: StaffModuleManagePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isStaff && user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const parsedModuleId = Number.parseInt(moduleId, 10);
  if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) notFound();

  let staffModules: Module[] = [];
  try {
    staffModules = await listModules(user.id, { scope: "staff" });
  } catch {
    redirect("/staff/modules");
  }
  const moduleRecord = staffModules.find((module) => Number(module.id) === parsedModuleId);
  if (!moduleRecord) redirect("/staff/modules");

  const canManageModule = moduleRecord.accountRole === "OWNER";
  if (!canManageModule) redirect(`/modules/${moduleRecord.id}`);

  let joinCode: string | null = null;
  try {
    joinCode = (await getEnterpriseModuleJoinCode(parsedModuleId)).joinCode;
  } catch (e) {
    if (!(e instanceof ApiError && (e.status === 403 || e.status === 404))) {
      throw e;
    }
  }

  return (
    <div className="ui-page enterprise-module-create-page enterprise-module-create-page--embedded">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Manage module</h1>
        <p className="ui-page__description">
          Update module guidance, leads, TAs, manual student assignments, and share the module join code from the staff
          workspace.
        </p>
      </header>

      <Card
        title={<span className="overview-title">Module setup</span>}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/staff/projects/create?moduleId=${encodeURIComponent(String(parsedModuleId))}`}
              className="btn btn--primary"
            >
              Create project
            </Link>
            <Link href="/staff/modules" className="btn btn--ghost">
              Back to my modules
            </Link>
          </div>
        }
        className="enterprise-module-create__card"
      >
        <EnterpriseModuleCreateForm
          mode="edit"
          moduleId={parsedModuleId}
          workspace="staff"
          joinCode={joinCode}
          created={resolvedSearchParams.created === "1"}
        />
      </Card>
    </div>
  );
}
