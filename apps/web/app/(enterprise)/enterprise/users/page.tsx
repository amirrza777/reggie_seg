import { redirect } from "next/navigation";
import { EnterpriseUserManagementPanel } from "@/features/enterprise/components/EnterpriseUserManagementPanel";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

export default async function EnterpriseUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isEnterpriseAdmin(user) && !isAdmin(user)) {
    redirect("/enterprise/modules");
  }

  return (
    <div className="ui-page enterprise-users-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">People</h1>
        <p className="ui-page__description">Manage enterprise members, permissions, and account access.</p>
      </header>

      <EnterpriseUserManagementPanel currentUserId={user.id} currentUserRole={user.role} />
    </div>
  );
}
