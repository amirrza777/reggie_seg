import { withSeedLogging } from "./logging";
import type { SeedContext } from "./types";
import { buildScenarioMemberIds, resolveScenarioActors, validateScenarioPrerequisites } from "./teamHealthScenario/actors";
import { clearPrimaryScenarioWarningsAndMeetings } from "./teamHealthScenario/cleanup";
import { seedExistingSeTeamHealthMessages, seedTeamHealthMessages } from "./teamHealthScenario/messages";
import { preparePrimaryScenarioTeam, resolveScenarioModuleId } from "./teamHealthScenario/setup";
import { buildTeamHealthScenarioDetails } from "./teamHealthScenario/summary";

export async function seedTeamHealthWarningScenario(context: SeedContext) {
  return withSeedLogging("seedTeamHealthWarningScenario", async () => {
    const moduleId = await resolveScenarioModuleId(context);
    const templateId = context.templates[0]?.id ?? null;
    const actors = await resolveScenarioActors(context);
    const memberIds = actors.requesterId ? buildScenarioMemberIds(context, actors.requesterId, actors.reviewerId) : [];
    const validation = validateScenarioPrerequisites(moduleId, templateId, actors.requesterId, memberIds);
    if (!validation.ok) return { value: undefined, rows: 0, details: validation.details };

    const requesterId = actors.requesterId as number;
    const setup = await preparePrimaryScenarioTeam(context, moduleId, templateId, memberIds);
    await seedTeamHealthMessages(setup.project.id, setup.team.id, requesterId, actors.reviewerId);
    const existingSeSeed = await seedExistingSeTeamHealthMessages(context, requesterId, actors.reviewerId);
    const deletedMeetings = await clearPrimaryScenarioWarningsAndMeetings(setup.project.id, setup.team.id);

    return {
      value: {
        projectId: setup.project.id,
        teamId: setup.team.id,
      },
      rows: 1,
      details: buildTeamHealthScenarioDetails(
        setup.project.id,
        setup.team.id,
        memberIds.length,
        setup.seededAssessments,
        deletedMeetings,
        existingSeSeed,
      ),
    };
  });
}
