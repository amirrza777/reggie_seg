/* Staff members can view the progress of peer assessments for each of the modules they manage */

import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { getModulesSummary } from "@/features/staff/peerAssessments/api/client";

// TODO: Get staffId from authentication
async function getStaffId(): Promise<number> {
  return 1;
}

export default async function StaffPeerAssessmentsPage() {
  const staffId = await getStaffId();
  const modules = await getModulesSummary(staffId);
  return (
    <div className="stack">
      <Placeholder
        title="All modules' peer assessments"
        path="/staff/peer-assessments"
        description="Progress overview of peer assessments."
      />
      <ProgressCardGrid
        items={modules}
        getHref={(item) => `/staff/peer-assessments/module/${item.id ?? ""}`}
      />
    </div>
  );
}
