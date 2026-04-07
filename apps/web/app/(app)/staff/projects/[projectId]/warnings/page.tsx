import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { ConfigureWarningPanel } from "@/features/staff/projects/warnings/components/ConfigureWarningPanel";   
import { getProjectWarningsConfig } from "@/features/staff/projects/warnings/api/client";
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

    const enabledCount = warnings.warningsConfig.rules.filter((rule: { enabled: any; }) => rule.enabled).length;

    return (
        <>
            <p className="muted">
              {enabledCount} active rule{enabledCount === 1 ? "" : "s"}
            </p>
            <ConfigureWarningPanel
            projectId={Number(projectId)}
            warningsConfig={warnings.warningsConfig}
            />
        </>
    );
}
