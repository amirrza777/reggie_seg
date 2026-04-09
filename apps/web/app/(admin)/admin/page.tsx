import { AdminWorkspaceSummary } from "@/features/admin/components/AdminWorkspaceSummary";
import { UserManagementTable } from "@/features/admin/components/UserManagementTable";

export default function AdminPage() {
  return (
    <div className="ui-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Admin workspace</h1>
        <p className="ui-page__description">Manage platform-level users, access, and operational controls.</p>
      </header>
      <AdminWorkspaceSummary />
      <UserManagementTable />
    </div>
  );
}
