import { EnterpriseFeatureFlagsCard } from "@/features/enterprise/components/feature-flags/EnterpriseFeatureFlagsCard";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";
import { redirect } from "next/navigation";

export default async function EnterpriseFeatureFlagsPage() {
  const user = await getCurrentUser();
  if (!user || (!isEnterpriseAdmin(user) && !isAdmin(user))) {
    redirect("/enterprise/modules");
  }

  return (
    <div className="ui-page enterprise-overview-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Enterprise feature flags</h1>
        <p className="ui-page__description">Enable or disable features for users in this enterprise workspace.</p>
      </header>
      <EnterpriseFeatureFlagsCard />
    </div>
  );
}
