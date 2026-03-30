import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffProjectNavFlagsPanel } from "@/features/staff/projects/components/StaffProjectNavFlagsPanel";
import { getCurrentUser } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import "@/features/staff/projects/styles/staff-projects.css";
import { StaffProjectSectionNav } from "@/features/staff/projects/components/StaffProjectSectionNav";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
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
  const loadResult = await loadStaffProjectTeamsForPage(
        user.id,
        projectId,
        "Failed to load project team allocation data."
    );
    if (loadResult.status === "invalid_project_id") {
        return <p className="muted">Invalid project ID.</p>;
    }
    if (loadResult.status === "error") {
        return (
        <div className="stack">
            <p className="muted">{loadResult.message}</p>
        </div>
        );
    }
    const { data } = loadResult;
    // <span className="staff-projects__badge">{enabledCount} Warning{ === 1 ? "" : "s"}</span>
    return (
        <div className="staff-projects">
            <StaffProjectSectionNav projectId={Number(projectId)} moduleId={data.project.moduleId} />
            <section className="staff-projects__hero">
            <p className="staff-projects__eyebrow">Feature Flags</p>
            <h1 className="staff-projects__title">{data.project.name}</h1>
            <div className="staff-projects__meta">
              
            </div>
            </section>

      <StaffProjectNavFlagsPanel projectId={numericProjectId} globalFeatureFlags={globalFeatureFlags} />
    </div>
  );
}
