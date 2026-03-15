import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";

type StaffModuleManagePageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleManagePage({ params }: StaffModuleManagePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isStaff && user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId } = await params;
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

  const canManageModule = moduleRecord.accountRole === "OWNER" || moduleRecord.accountRole === "ADMIN_ACCESS";
  if (!canManageModule) redirect(`/modules/${moduleRecord.id}`);

  return (
    <div className="ui-page enterprise-module-create-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Manage module</h1>
        <p className="ui-page__description">
          Update module guidance, leads, TAs, and student assignments from the staff workspace.
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
        <EnterpriseModuleCreateForm mode="edit" moduleId={parsedModuleId} workspace="staff" />
      </Card>
    </div>
  );
}
