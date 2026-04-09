import Link from "next/link";
import { getProjectWarningsConfig } from "@/features/staff/projects/warnings/api/client";
import { mapApiConfigToState } from "@/features/staff/projects/warnings/api/mapper";
import { WarningRulesReadOnlySummary } from "@/features/staff/projects/warnings/components/WarningRulesReadOnlySummary";
import { Card } from "@/shared/ui/Card";
import "@/features/staff/projects/styles/staff-projects.css";

export default async function StaffProjectWarningsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);

  const warnings = await getProjectWarningsConfig(numericProjectId).catch(() => null);
  if (!warnings) {
    return (
      <div className="stack">
        <p className="muted">Failed to load project warnings configuration.</p>
      </div>
    );
  }

  const manageHref = `/staff/projects/${encodeURIComponent(projectId)}/manage`;
  const { state: summaryState, extraRules } = mapApiConfigToState(warnings.warningsConfig);

  return (
    <div className="stack">
      <Card
        title={<span className="overview-title">Warning rules</span>}
        action={
          <Link href={manageHref} className="btn btn--ghost">
            Edit in settings
          </Link>
        }
        className="enterprise-module-create__card"
      >
        <p className="ui-note ui-note--muted">
          Rules that raise automatic warnings when attendance, meetings, or repository activity fall below your
          thresholds.
        </p>
        <WarningRulesReadOnlySummary state={summaryState} extraRules={extraRules} />
      </Card>
    </div>
  );
}
