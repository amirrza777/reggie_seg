import { EnterpriseModuleManager } from "@/features/enterprise/components/EnterpriseModuleManager";

export default function EnterpriseModulesPage() {
  return (
    <div className="ui-page ui-page--narrow">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Module management</h1>
        <p className="ui-page__description">Create modules and assign student enrollments for this enterprise.</p>
      </header>

      <EnterpriseModuleManager />
    </div>
  );
}
