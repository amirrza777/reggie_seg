import { EnterpriseOverviewSummary } from "@/features/enterprise/components/EnterpriseOverviewSummary";

export default function EnterpriseHomePage() {
  return (
    <div className="ui-page enterprise-overview-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Enterprise overview</h1>
        <p className="ui-page__description">Overview of enterprise controls and management areas.</p>
      </header>

      <EnterpriseOverviewSummary />
    </div>
  );
}
