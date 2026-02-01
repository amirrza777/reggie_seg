/* Staff can see peer assessment progress for students in a given team (for one of their modules) */

import { Placeholder } from "@/shared/ui/Placeholder";
import type { ProgressCardData } from "@/shared/ui/ProgressCard";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { PerformanceSummaryCard } from "@/shared/ui/PerformanceSummaryCard";
import type { PerformanceSummaryData } from "@/shared/ui/PerformanceSummaryCard";

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

// TODO: replace with actual db call
const demoTeamSummaries: Record<string, PerformanceSummaryData> = {
  "team-1": {
    overallAverage: 4.25,
    totalReviews: 12, // Total peer assessments submitted within the team
    moduleId: "mod-1",
    teamId: "team-1",
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.3, totalReviews: 12 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.2, totalReviews: 12 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.3, totalReviews: 12 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.4, totalReviews: 12 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.1, totalReviews: 12 },
    ],
  },
  "team-2": {
    overallAverage: 4.0,
    totalReviews: 8,
    moduleId: "mod-1",
    teamId: "team-2",
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.0, totalReviews: 8 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.0, totalReviews: 8 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.0, totalReviews: 8 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.0, totalReviews: 8 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.0, totalReviews: 8 },
    ],
  },
  "team-3": {
    overallAverage: 4.1,
    totalReviews: 6,
    moduleId: "mod-1",
    teamId: "team-3",
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.1, totalReviews: 6 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.1, totalReviews: 6 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.1, totalReviews: 6 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.1, totalReviews: 6 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.1, totalReviews: 6 },
    ],
  },
  "team-4": {
    overallAverage: 4.15,
    totalReviews: 4,
    moduleId: "mod-1",
    teamId: "team-4",
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.2, totalReviews: 4 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.1, totalReviews: 4 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.1, totalReviews: 4 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.2, totalReviews: 4 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.1, totalReviews: 4 },
    ],
  },
};

export default async function TeamPage({ params }: PageProps) {
  const { id: moduleId, teamId } = await params;

  const moduleTitle = demoModuleTitles[moduleId] ?? `Module ${moduleId}`;
  const teamTitle = demoTeamTitles[teamId] ?? `Team ${teamId}`;

  // TODO: replace with actual db call
  const teamSummary = demoTeamSummaries[teamId] ?? {
    overallAverage: 0,
    totalReviews: 0,
    questionAverages: [],
    moduleId,
    teamId,
  };

  return (
    <div className="stack">
      <Placeholder
        title={`${moduleTitle} - ${teamTitle}`}
        path={`/admin/peerAssessments/module/${moduleId}/team/${teamId}`}
        description="Detailed view of peer assessments for this team."
      />
      <PerformanceSummaryCard 
        title={`${teamTitle} - Team Performance Summary`}
        data={teamSummary}
      />
      <ProgressCardGrid
        items={demoStudents}
        getHref={(item) => `/staff/peer-assessments/module/${moduleId}/team/${teamId}/student/${item.id}`}
      />
    </div>
  );
}