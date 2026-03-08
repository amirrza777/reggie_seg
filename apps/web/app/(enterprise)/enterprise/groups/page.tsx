import { Card } from "@/shared/ui/Card";

export default function EnterpriseGroupsPage() {
  return (
    <div className="ui-page ui-page--narrow">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Group management</h1>
        <p className="ui-page__description">Assign and manage groups within modules.</p>
      </header>

      <Card title="Coming soon">
        <p className="muted">
          Group assignment workflows will live here. Next step: select a module, create groups, and place students into
          groups.
        </p>
      </Card>
    </div>
  );
}
