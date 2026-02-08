import { AdminWorkspaceSummary } from "@/features/admin/components/AdminWorkspaceSummary";
import { FeatureFlagsCard } from "@/features/admin/components/FeatureFlagsCard";
import { UserManagementTable } from "@/features/admin/components/UserManagementTable";

export default function AdminPage() {
  return (
    <div className="stack">
      <AdminWorkspaceSummary />
      <UserManagementTable />
      <FeatureFlagsCard />
    </div>
  );
}