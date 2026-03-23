import Link from "next/link";
import { notFound } from "next/navigation";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { Card } from "@/shared/ui/Card";

type EnterpriseModuleEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string; joinCode?: string }>;
};

export default async function EnterpriseModuleEditPage({ params, searchParams }: EnterpriseModuleEditPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const moduleId = Number.parseInt(id, 10);

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    notFound();
  }

  return (
    <div className="ui-page enterprise-module-create-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Edit module</h1>
        <p className="ui-page__description">
          Update module guidance, manage access levels, and share the module join code for student self-enrollment.
        </p>
      </header>

      <Card
        title={<span className="overview-title">Module setup</span>}
        action={
          <Link href="/enterprise/modules" className="btn btn--ghost">
            Back to modules
          </Link>
        }
        className="enterprise-module-create__card"
      >
        <EnterpriseModuleCreateForm
          mode="edit"
          moduleId={moduleId}
          createdJoinCode={resolvedSearchParams.created === "1" ? resolvedSearchParams.joinCode ?? null : null}
        />
      </Card>
    </div>
  );
}
