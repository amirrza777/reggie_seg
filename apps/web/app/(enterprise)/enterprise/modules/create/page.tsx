import Link from "next/link";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { Card } from "@/shared/ui/Card";

export default function EnterpriseModuleCreatePage() {
  return (
    <div className="ui-page enterprise-module-create-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Create module</h1>
        <p className="ui-page__description">
          Capture module guidance and define access levels for owners/leaders, teaching assistants, and students.
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
        <EnterpriseModuleCreateForm />
      </Card>
    </div>
  );
}
