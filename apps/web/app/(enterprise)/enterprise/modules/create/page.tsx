import { redirect } from "next/navigation";
import { EnterpriseModuleCreateForm } from "@/features/enterprise/components/EnterpriseModuleCreateForm";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";
import { Card } from "@/shared/ui/Card";
import { Breadcrumbs } from "@/shared/layout/Breadcrumbs";

export default async function EnterpriseModuleCreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isEnterpriseAdmin(user) && !isAdmin(user)) redirect("/enterprise/modules");

  return (
    <div className="ui-page enterprise-module-create-page">
      <Breadcrumbs items={[{ label: "Module management", href: "/enterprise/modules" }, { label: "Create module" }]} />

      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Create module</h1>
        <p className="ui-page__description">
          Create the module shell, assign module leaders, and then share the generated join code from module edit.
        </p>
      </header>

      <Card title={<span className="overview-title">Module setup</span>} className="enterprise-module-create__card">
        <EnterpriseModuleCreateForm />
      </Card>
    </div>
  );
}
