/* Staff can see peer assessment progress for students in a given team (for one of their modules) */

import { Placeholder } from "@/shared/ui/Placeholder";
import type { ProgressCardData } from "@/shared/ui/ProgressCard";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";

type PageProps = {
  params: Promise<{
    id: string; 
    teamId: string;
  }>;
};

// TODO: replace with actual db call
const demoStudents: ProgressCardData[] = [
  { id: "1", title: "Amy", progress: 100 },
  { id: "2", title: "Ben", progress: 67 },
  { id: "3", title: "Cal", progress: 33 },
  { id: "4", title: "Dan", progress: 33 },
];

const demoModuleTitles: Record<string, string> = {
  "mod-1": "ModuleA",
  "mod-2": "ModuleB",
  "mod-3": "ModuleC",
  "mod-4": "ModuleD",
};

const demoTeamTitles: Record<string, string> = {
  "team-1": "TeamA",
  "team-2": "TeamB",
  "team-3": "TeamC",
  "team-4": "TeamD",
};

export default async function TeamPage({ params }: PageProps) {
  const { id: moduleId, teamId } = await params;

  const moduleTitle = demoModuleTitles[moduleId] ?? `Module ${moduleId}`;
  const teamTitle = demoTeamTitles[teamId] ?? `Team ${teamId}`;

  return (
    <div className="stack">
      <Placeholder
        title={`${moduleTitle} - ${teamTitle}`}
        path={`/admin/peerAssessments/module/${moduleId}/team/${teamId}`}
        description="Detailed view of peer assessments for this team."
      />
      <ProgressCardGrid
        items={demoStudents}
        getHref={(item) => `/admin/peerAssessments/module/${moduleId}/team/${teamId}/student/${item.id}`}
      />
    </div>
  );
}