import type { ExistingScenarioSeed } from "./types";

export function buildTeamHealthScenarioDetails(
  projectId: number,
  teamId: number,
  memberCount: number,
  seededAssessments: number,
  deletedMeetings: number,
  existingSeSeed: ExistingScenarioSeed,
) {
  const base =
    `project=${projectId}, team=${teamId}, members=${memberCount}, ` +
    `stage=feedback-open, seededAssessments=${seededAssessments}, deletedMeetings=${deletedMeetings}, warningsConfig=3-rules`;
  if (!existingSeSeed.seeded) return base;
  return `${base}, existingSeProject=${existingSeSeed.projectId}, existingSeTeam=${existingSeSeed.teamId}`;
}
