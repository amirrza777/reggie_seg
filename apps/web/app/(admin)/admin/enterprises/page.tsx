import { redirect } from "next/navigation";
import { EnterpriseManagementTable } from "@/features/admin/components/EnterpriseManagementTable";
import { getCurrentUser } from "@/shared/auth/session";

const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";

export default async function AdminEnterprisesPage() {
  const user = await getCurrentUser();
  if (!user || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    redirect("/admin");
  }

  return (
    <div className="ui-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Enterprises</h1>
        <p className="ui-page__description">Manage enterprise workspaces, account pools, and ownership.</p>
      </header>
      <EnterpriseManagementTable isSuperAdmin />
    </div>
  );
}
