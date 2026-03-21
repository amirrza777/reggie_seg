import { EnterpriseModuleManager } from "@/features/enterprise/components/EnterpriseModuleManager";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

export default async function EnterpriseModulesPage() {
  const user = await getCurrentUser();
  const canCreateModule = user ? isEnterpriseAdmin(user) || isAdmin(user) : false;

  return (
    <div className="ui-page enterprise-modules-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Module management</h1>
        <p className="ui-page__description">Create and manage modules for this enterprise.</p>
      </header>

      <EnterpriseModuleManager canCreateModule={canCreateModule} />
    </div>
  );
}
