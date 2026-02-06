/* Staff members can view the progress of peer assessments for each of the modules they manage */

import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import type { ProgressCardData } from "@/shared/ui/ProgressCard";
import { getMyModules } from "@/features/staff/peerAssessments/api/client";


// TODO: replace with actual db call
const demoModules: ProgressCardData[] = [
  { id: "mod-1", title: "ModuleA", progress: 75 },
  { id: "mod-2", title: "ModuleB", progress: 45 },
  { id: "mod-3", title: "ModuleC", progress: 90 },
  { id: "mod-4", title: "ModuleD", progress: 30 },
];
// TODO: Get staffId from authentication
async function getStaffId(): Promise<number> {
  return 1;
}

export default async function StaffPeerAssessmentsPage() {
  const staffId = await getStaffId();
  const modules = await getMyModules(staffId);
  console.log(modules);
  return (
    <div className="stack">
      <Placeholder
        title="All modules' peer assessments"
        path="/staff/peer-assessments"
        description="Progress overview of peer assessments."
      />
      <ProgressCardGrid
        items={demoModules}
        getHref={(item) => `/staff/peer-assessments/module/${item.id}`}
      />
      <pre>{JSON.stringify(modules, null, 2)}</pre>
    </div>
  );
}
