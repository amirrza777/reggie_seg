import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import type { ProgressCardData } from "@/shared/ui/ProgressCard";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

// TODO: replace with actual db call
const demoModules: Record<string, { title: string; teams: ProgressCardData[] }> = {
  "mod-1": {
    title: "ModuleA",
    teams: [
      { id: "team-1", title: "TeamA", progress: 80 },
      { id: "team-2", title: "TeamB", progress: 65 },
      { id: "team-3", title: "TeamC", progress: 45 },
      { id: "team-4", title: "TeamD", progress: 90 },
    ],
  },
  "mod-2": {
    title: "ModuleB",
    teams: [
      { id: "team-1", title: "TeamA", progress: 60 },
      { id: "team-2", title: "TeamB", progress: 75 },
    ],
  },
  "mod-3": {
    title: "ModuleC",
    teams: [
      { id: "team-1", title: "TeamA", progress: 90 },
      { id: "team-2", title: "TeamB", progress: 85 },
      { id: "team-3", title: "TeamC", progress: 70 },
    ],
  },
  "mod-4": {
    title: "ModuleD",
    teams: [
      { id: "team-1", title: "TeamA", progress: 30 },
      { id: "team-2", title: "TeamB", progress: 40 },
    ],
  },
};

export default async function ModulePage({ params }: PageProps) {
  const { id } = await params;
  const moduleData = demoModules[id] ?? {
    title: `Module ${id}`,
    teams: [],
  };

  return (
    <div className="stack">
      <Placeholder
        title={moduleData.title}
        path={`/admin/peerAssessments/module/${id}`}
        description="Progress overview of a given module's peer assessments."
      />
      <ProgressCardGrid
        items={moduleData.teams}
        getHref={(item) => `/admin/peerAssessments/module/${id}/team/${item.id}`}
      />
    </div>
  );
}
