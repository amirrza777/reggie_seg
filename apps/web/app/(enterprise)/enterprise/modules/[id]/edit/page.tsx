import { notFound } from "next/navigation";
import { getEnterpriseModuleJoinCode } from "@/features/enterprise/api/client";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { ApiError } from "@/shared/api/errors";
import { Breadcrumbs } from "@/shared/layout/Breadcrumbs";
import { Card } from "@/shared/ui/Card";

type EnterpriseModuleEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string }>;
};

export default async function EnterpriseModuleEditPage({ params, searchParams }: EnterpriseModuleEditPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const moduleId = Number.parseInt(id, 10);

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    notFound();
  }

  let joinCode: string | null = null;
  try {
    joinCode = (await getEnterpriseModuleJoinCode(moduleId)).joinCode;
  } catch (e) {
    if (!(e instanceof ApiError && (e.status === 403 || e.status === 404))) {
      throw e;
    }
  }

  return (
    <div className="ui-page enterprise-module-create-page">
      <Breadcrumbs items={[{ label: "Module management", href: "/enterprise/modules" }, { label: "Edit module" }]} />

      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Edit module</h1>
        <p className="ui-page__description">
          Update module guidance, manage access levels, and share the module join code for student self-enrollment.
        </p>
      </header>

      <Card title="Module setup" className="enterprise-module-create__card">
        <EnterpriseModuleCreateForm
          mode="edit"
          moduleId={moduleId}
          joinCode={joinCode}
          created={resolvedSearchParams.created === "1"}
        />
      </Card>
    </div>
  );
}
