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
    <>
      <StaffProjectNavFlagsPanel projectId={numericProjectId} globalFeatureFlags={globalFeatureFlags} />
    </>
  );
}
