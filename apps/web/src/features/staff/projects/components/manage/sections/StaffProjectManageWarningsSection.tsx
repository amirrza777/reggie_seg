"use client";

import Link from "next/link";
import type { ProjectWarningsConfig } from "@/features/projects/types";
import { ConfigureWarningPanel } from "@/features/staff/projects/warnings/components/ConfigureWarningPanel";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

type StaffProjectManageWarningsSectionProps = {
  warningsOk: boolean;
  warningsConfig: ProjectWarningsConfig | null;
  warningsTabHref: string;
};

export function StaffProjectManageWarningsSection({
  warningsOk,
  warningsConfig,
  warningsTabHref,
}: StaffProjectManageWarningsSectionProps) {
  const { projectId, detailsDisabled } = useStaffProjectManageSetup();

  return (
    <StaffProjectManageFormCollapsible title="Team health warnings" defaultOpen={false}>
      <p className="ui-note ui-note--muted">
        Adjust thresholds and severities for automatic warnings.
      </p>
      {warningsOk && warningsConfig ? (
        <ConfigureWarningPanel
          projectId={projectId}
          warningsConfig={warningsConfig}
          readOnly={detailsDisabled}
        />
      ) : (
        <p className="muted">Could not load warning configuration. Refresh the page or try again shortly.</p>
      )}
    </StaffProjectManageFormCollapsible>
  );
}
