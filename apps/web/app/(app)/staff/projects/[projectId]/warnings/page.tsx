import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { ConfigureWarningPanel } from "@/features/staff/projects/warnings/components/ConfigureWarningPanel";   
import { getProjectWarningsConfig } from "@/features/staff/projects/warnings/api/client";
import { StaffProjectSectionNav } from "@/features/staff/projects/components/StaffProjectSectionNav";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";

export default async function StaffProjectWarningsPage({ params } : { params : Promise<{projectId: string}> }) {
    const user = await getCurrentUser();
    if (!user?.isStaff && user?.role !== "ADMIN") {
        redirect("/dashboard");
    }   
    const { projectId } = await params;
    const warnings = await getProjectWarningsConfig(Number(projectId)).catch(() => null);
    if (!warnings) {
        return (
            <div className="stack">
                <p className="muted">Failed to load project warnings configuration.</p>
            </div>
        );
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
    const enabledCount = warnings.warningsConfig.rules.filter((rule: { enabled: any; }) => rule.enabled).length;
    
    return (
        <div className="staff-projects">
            <StaffProjectSectionNav projectId={Number(projectId)} moduleId={data.project.moduleId} />
            <section className="staff-projects__hero">
            <p className="staff-projects__eyebrow">Warnings</p>
            <h1 className="staff-projects__title">{data.project.name}</h1>
            <div className="staff-projects__meta">
            <span className="staff-projects__badge">{enabledCount} Warning{enabledCount === 1 ? "" : "s"}</span>
            </div>

        </section>
            <ConfigureWarningPanel 
            projectId={projectId} 
            projectName={warnings.projectName}
            warningsConfig={warnings.config}
            />
        </div>
    );
}