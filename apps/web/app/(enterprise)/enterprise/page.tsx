import Link from "next/link";
import { Card } from "@/shared/ui/Card";
import { EnterpriseOverviewSummary } from "@/features/enterprise/components/EnterpriseOverviewSummary";

export default function EnterpriseHomePage() {
  return (
    <div className="ui-page enterprise-overview-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Enterprise overview</h1>
        <p className="ui-page__description">Overview of enterprise controls and management areas.</p>
      </header>

      <Card title="Sections" className="enterprise-overview__sections-card">
        <div className="ui-stack-sm">
          <p className="muted">Use these sections to manage enterprise structure.</p>
          <div className="ui-row ui-row--wrap enterprise-overview__section-actions">
            <Link href="/enterprise/modules" className="btn btn--primary">
              Module management
            </Link>
            <Link href="/enterprise/groups" className="btn btn--ghost">
              Group management
            </Link>
          </div>
        </div>
      </Card>

      <EnterpriseOverviewSummary />
    </div>
  );
}
