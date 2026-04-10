import { withSeedLogging } from "./logging";
import { seedCompletedUnmarkedStudentViewScenario } from "./peer-assessment-completed-unmarked-scenario";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";
import {
  ASSESSMENT_OPEN_PROJECT_NAME,
  ASSESSMENT_OPEN_TEAM_NAME,
  FEEDBACK_OPEN_PROJECT_NAME,
  FEEDBACK_OPEN_TEAM_NAME,
} from "./peerAssessmentScenario/constants";
import { clearScenarioPeerData, getTemplateQuestionLabels, upsertScenarioAssessments } from "./peerAssessmentScenario/assessments";
import { prepareScenarioTeam } from "./peerAssessmentScenario/setup";
import { resolveScenarioSeedTarget } from "./peerAssessmentScenario/target";

async function seedAssessmentOpenScenario(
  enterpriseId: string,
  moduleId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[],
) {
  const seeded = await prepareScenarioTeam({
    enterpriseId,
    moduleId,
    templateId,
    projectName: ASSESSMENT_OPEN_PROJECT_NAME,
    teamName: ASSESSMENT_OPEN_TEAM_NAME,
    informationText: "This scenario keeps the project in an active peer-assessment window so reviewers can submit assessments now.",
    deadlineOffsetDays: { taskOpen: -12, taskDue: -2, assessmentOpen: -1, assessmentDue: 3, feedbackOpen: 4, feedbackDue: 8 },
    memberIds,
  });
  await clearScenarioPeerData(seeded.project.id, seeded.team.id);
  return {
    projectId: seeded.project.id,
    teamId: seeded.team.id,
    questionLabels,
    createdAllocations: seeded.createdAllocations,
  };
}

async function seedFeedbackPendingScenario(
  enterpriseId: string,
  moduleId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[],
) {
  const seeded = await prepareScenarioTeam({
    enterpriseId,
    moduleId,
    templateId,
    projectName: FEEDBACK_OPEN_PROJECT_NAME,
    teamName: FEEDBACK_OPEN_TEAM_NAME,
    informationText: "This scenario has peer assessments completed while peer feedback is currently open and pending submission.",
    deadlineOffsetDays: { taskOpen: -21, taskDue: -14, assessmentOpen: -13, assessmentDue: -3, feedbackOpen: -2, feedbackDue: 5 },
    memberIds,
  });
  await prisma.peerFeedback.deleteMany({ where: { teamId: seeded.team.id } });
  const assessmentCount = await upsertScenarioAssessments(seeded.project.id, seeded.team.id, templateId, memberIds, questionLabels);

  return {
    projectId: seeded.project.id,
    teamId: seeded.team.id,
    createdAllocations: seeded.createdAllocations,
    assessmentCount,
  };
}

export async function seedPeerAssessmentProgressScenarios(context: SeedContext) {
  return withSeedLogging("seedPeerAssessmentProgressScenarios", async () => {
    const target = await resolveScenarioSeedTarget(context);
    if (!target.ready) return target.result;

    const questionLabels = await getTemplateQuestionLabels(target.template.id, target.template.questionLabels);
    const assessmentOpen = await seedAssessmentOpenScenario(
      context.enterprise.id,
      target.module.id,
      target.template.id,
      target.memberIds,
      questionLabels,
    );
    const feedbackPending = await seedFeedbackPendingScenario(
      context.enterprise.id,
      target.module.id,
      target.template.id,
      target.memberIds,
      questionLabels,
    );
    const completedUnmarked = await seedCompletedUnmarkedStudentViewScenario(
      context,
      target.module.id,
      target.template.id,
      questionLabels,
    );

    return {
      value: {
        assessmentOpenProjectId: assessmentOpen.projectId,
        feedbackPendingProjectId: feedbackPending.projectId,
        completedUnmarkedProjectId: completedUnmarked?.projectId ?? null,
      },
      rows: completedUnmarked ? 3 : 2,
      details: completedUnmarked
        ? `projects=3, teams=3, assessments=${feedbackPending.assessmentCount + completedUnmarked.assessmentCount}, feedbacks=${completedUnmarked.feedbackCount}, allocations=${assessmentOpen.createdAllocations + feedbackPending.createdAllocations + completedUnmarked.createdAllocations}, clearedMarkings=${completedUnmarked.clearedMarkings}`
        : `projects=2, teams=2, assessments=${feedbackPending.assessmentCount}, allocations=${assessmentOpen.createdAllocations + feedbackPending.createdAllocations}`,
    };
  });
}
