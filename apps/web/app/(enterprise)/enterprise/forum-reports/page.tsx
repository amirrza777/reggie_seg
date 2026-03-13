import { ForumReportsTable } from "@/features/enterprise/components/ForumReportsTable";

export default function EnterpriseForumReportsPage() {
  return (
    <div className="ui-page enterprise-overview-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Forum reports</h1>
        <p className="ui-page__description">
          Review posts reported by staff and dismiss reports once reviewed.
        </p>
      </header>
      <ForumReportsTable />
    </div>
  );
}
