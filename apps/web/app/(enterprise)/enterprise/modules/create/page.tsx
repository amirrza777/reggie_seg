import Link from "next/link";
import { redirect } from "next/navigation";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";
import { Card } from "@/shared/ui/Card";

export default async function EnterpriseModuleCreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isEnterpriseAdmin(user) && !isAdmin(user)) redirect("/enterprise/modules");

  return (
    <div className="ui-page enterprise-module-create-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Create module</h1>
        <p className="ui-page__description">
          Create the module shell and assign module leaders. Operational setup is managed in module edit.
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
