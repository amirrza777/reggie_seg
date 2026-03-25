import Link from "next/link";
import { notFound } from "next/navigation";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
import { Card } from "@/shared/ui/Card";

type EnterpriseModuleEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EnterpriseModuleEditPage({ params }: EnterpriseModuleEditPageProps) {
  const { id } = await params;
  const moduleId = Number.parseInt(id, 10);

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    notFound();
  }

  const initialAccessSelection = await loadModuleSetupInitialSelection(moduleId);
  if (!initialAccessSelection) {
    notFound();
  }

  return (
    <div className="ui-page enterprise-module-create-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Edit module</h1>
        <p className="ui-page__description">
          Update module guidance and manage access levels for owners/leaders, teaching assistants, and students.
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
        <EnterpriseModuleCreateForm mode="edit" moduleId={moduleId} initialAccessSelection={initialAccessSelection} />
      </Card>
    </div>
  );
}
