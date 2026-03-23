import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffProjectNavFlagsPanel } from "@/features/staff/projects/components/StaffProjectNavFlagsPanel";
import { getCurrentUser } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectFeatureFlagsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectFeatureFlagsPage({ params }: StaffProjectFeatureFlagsPageProps) {
  const [user, globalFeatureFlags] = await Promise.all([getCurrentUser(), getFeatureFlagMap()]);
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  if (Number.isNaN(numericProjectId)) {
    return <p className="muted">Invalid project ID.</p>;
  }

  return (
    <div className="ui-page enterprise-overview-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Project feature flags</h1>
        <p className="ui-page__description">
          Configure which project navigation tabs are visible when a project is active vs completed.
        </p>
        <Link href={`/staff/projects/${numericProjectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project
        </Link>
      </header>

      <StaffProjectNavFlagsPanel projectId={numericProjectId} globalFeatureFlags={globalFeatureFlags} />
    </div>
  );
}
