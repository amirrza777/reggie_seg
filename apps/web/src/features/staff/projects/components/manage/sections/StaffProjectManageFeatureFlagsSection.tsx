"use client";

import { StaffProjectNavFlagsPanel } from "../../navigation/StaffProjectNavFlagsPanel";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

export function StaffProjectManageFeatureFlagsSection() {
  const { projectId, detailsDisabled } = useStaffProjectManageSetup();

  return (
    <StaffProjectManageFormCollapsible title="Feature flags" defaultOpen={false}>
      <p className="ui-note ui-note--muted">
        Choose which tabs students can open while the project is active versus completed. Peer assessment and peer
        feedback can follow deadlines automatically or be controlled manually.
      </p>
      <StaffProjectNavFlagsPanel projectId={projectId} readOnly={detailsDisabled} />
    </StaffProjectManageFormCollapsible>
  );
}
