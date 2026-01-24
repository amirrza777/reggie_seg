/* Staff members can view the progress of peer assessments for each of the modules they manage */

import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import type { ProgressCardData } from "@/shared/ui/ProgressCard";

// TODO: replace with actual db call
const demoModules: ProgressCardData[] = [
  { id: "mod-1", title: "ModuleA", progress: 75 },
  { id: "mod-2", title: "ModuleB", progress: 45 },
  { id: "mod-3", title: "ModuleC", progress: 90 },
  { id: "mod-4", title: "ModuleD", progress: 30 },
];

export default function AdminPage() {
  return (
    <div className="stack">
      <Placeholder
        title="All modules' peer assessments"
        path="/admin/peerAssessments"
        description="Progress overview of peer assessments."
      />
      <ProgressCardGrid
        items={demoModules}
        getHref={(item) => `/admin/peerAssessments/module/${item.id}`}
      />
    </div>
  );
}
