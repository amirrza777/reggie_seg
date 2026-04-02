import { Role } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const ASSESSMENT_OPEN_PROJECT_NAME = "Assessment Open Demo Project";
const ASSESSMENT_OPEN_TEAM_NAME = "Assessment Open Demo Team";
const FEEDBACK_OPEN_PROJECT_NAME = "Feedback Pending Demo Project";
const FEEDBACK_OPEN_TEAM_NAME = "Feedback Pending Demo Team";

function uniqueUserIds(userIds: number[]) {
  return Array.from(new Set(userIds.filter((value) => Number.isInteger(value) && value > 0)));
}

async function ensureScenarioProject(
  enterpriseId: string,
  moduleId: number,
  templateId: number,
  name: string,
  informationText: string
) {
  const existing = await prisma.project.findFirst({
    where: {
      name,
      module: { enterpriseId },
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: {
        moduleId,
        questionnaireTemplateId: templateId,
        informationText,
      },
      select: { id: true, questionnaireTemplateId: true },
    });
  }

  return prisma.project.create({
    data: {
      name,
      moduleId,
      questionnaireTemplateId: templateId,
      informationText,
    },
    select: { id: true, questionnaireTemplateId: true },
  });
}

async function ensureScenarioTeam(enterpriseId: string, projectId: number, teamName: string) {
  const existing = await prisma.team.findUnique({
    where: {
      enterpriseId_teamName: {
        enterpriseId,
        teamName,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.team.update({
      where: { id: existing.id },
      data: {
        projectId,
        allocationLifecycle: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true },
    });
  }

  return prisma.team.create({
    data: {
      enterpriseId,
      projectId,
      teamName,
      allocationLifecycle: "ACTIVE",
    },
    select: { id: true },
  });
}

async function ensureTeamAllocations(teamId: number, memberIds: number[]) {
  const existing = await prisma.teamAllocation.findMany({
    where: {
      teamId,
      userId: { in: memberIds },
    },
    select: { userId: true },
  });
  const existingUserIds = new Set(existing.map((row) => row.userId));
  const createRows = memberIds
    .filter((userId) => !existingUserIds.has(userId))
    .map((userId) => ({ teamId, userId }));

  if (createRows.length > 0) {
    await prisma.teamAllocation.createMany({
      data: createRows,
      skipDuplicates: true,
    });
  }

  return createRows.length;
}

async function upsertProjectDeadline(
  projectId: number,
  dates: {
    taskOpenDate: Date;
    taskDueDate: Date;
    assessmentOpenDate: Date;
    assessmentDueDate: Date;
    feedbackOpenDate: Date;
    feedbackDueDate: Date;
  }
) {
  await prisma.projectDeadline.upsert({
    where: { projectId },
    update: dates,
    create: {
      projectId,
      ...dates,
    },
  });
}

function buildAssessmentAnswer(label: string, reviewerId: number, revieweeId: number) {
  const tone = (reviewerId + revieweeId + label.length) % 3;
  if (tone === 0) return "Consistent contribution throughout delivery with clear ownership of tasks.";
  if (tone === 1) return "Good delivery pace and reliable collaboration during implementation and review.";
  return "Steady engagement and helpful communication across planning, coding, and team check-ins.";
}

function buildAnswersJson(questionLabels: string[], reviewerId: number, revieweeId: number) {
  return Object.fromEntries(
    questionLabels.map((label) => [label, buildAssessmentAnswer(label, reviewerId, revieweeId)])
  );
}

async function getTemplateQuestionLabels(templateId: number, fallback: string[]) {
  const rows = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { label: true },
  });
  if (rows.length > 0) {
    return rows.map((row) => row.label);
  }
  if (fallback.length > 0) return fallback;
  return ["Overall contribution"];
}

async function seedAssessmentOpenScenario(
  enterpriseId: string,
  moduleId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[]
) {
  const project = await ensureScenarioProject(
    enterpriseId,
    moduleId,
    templateId,
    ASSESSMENT_OPEN_PROJECT_NAME,
    "This scenario keeps the project in an active peer-assessment window so reviewers can submit assessments now."
  );
  const team = await ensureScenarioTeam(enterpriseId, project.id, ASSESSMENT_OPEN_TEAM_NAME);
  const createdAllocations = await ensureTeamAllocations(team.id, memberIds);

  const now = Date.now();
  await upsertProjectDeadline(project.id, {
    taskOpenDate: new Date(now - 12 * DAY_MS),
    taskDueDate: new Date(now - 2 * DAY_MS),
    assessmentOpenDate: new Date(now - 1 * DAY_MS),
    assessmentDueDate: new Date(now + 3 * DAY_MS),
    feedbackOpenDate: new Date(now + 4 * DAY_MS),
    feedbackDueDate: new Date(now + 8 * DAY_MS),
  });

  await prisma.peerFeedback.deleteMany({ where: { teamId: team.id } });
  await prisma.peerAssessment.deleteMany({
    where: { projectId: project.id, teamId: team.id },
  });

  return {
    projectId: project.id,
    teamId: team.id,
    questionLabels,
    createdAllocations,
  };
}

async function seedFeedbackPendingScenario(
  enterpriseId: string,
  moduleId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[]
) {
  const project = await ensureScenarioProject(
    enterpriseId,
    moduleId,
    templateId,
    FEEDBACK_OPEN_PROJECT_NAME,
    "This scenario has peer assessments completed while peer feedback is currently open and pending submission."
  );
  const team = await ensureScenarioTeam(enterpriseId, project.id, FEEDBACK_OPEN_TEAM_NAME);
  const createdAllocations = await ensureTeamAllocations(team.id, memberIds);

  const now = Date.now();
  await upsertProjectDeadline(project.id, {
    taskOpenDate: new Date(now - 21 * DAY_MS),
    taskDueDate: new Date(now - 14 * DAY_MS),
    assessmentOpenDate: new Date(now - 13 * DAY_MS),
    assessmentDueDate: new Date(now - 3 * DAY_MS),
    feedbackOpenDate: new Date(now - 2 * DAY_MS),
    feedbackDueDate: new Date(now + 5 * DAY_MS),
  });

  await prisma.peerFeedback.deleteMany({ where: { teamId: team.id } });

  let assessmentCount = 0;
  for (let reviewerIndex = 0; reviewerIndex < memberIds.length; reviewerIndex += 1) {
    const reviewerUserId = memberIds[reviewerIndex];

    for (let revieweeIndex = 0; revieweeIndex < memberIds.length; revieweeIndex += 1) {
      const revieweeUserId = memberIds[revieweeIndex];
      if (reviewerUserId === revieweeUserId) continue;

      const answersJson = buildAnswersJson(questionLabels, reviewerUserId, revieweeUserId);
      await prisma.peerAssessment.upsert({
        where: {
          projectId_teamId_reviewerUserId_revieweeUserId: {
            projectId: project.id,
            teamId: team.id,
            reviewerUserId,
            revieweeUserId,
          },
        },
        update: {
          templateId,
          answersJson,
          submittedLate: false,
          effectiveDueDate: null,
        },
        create: {
          projectId: project.id,
          teamId: team.id,
          reviewerUserId,
          revieweeUserId,
          templateId,
          answersJson,
          submittedLate: false,
        },
      });
      assessmentCount += 1;
    }
  }

  return {
    projectId: project.id,
    teamId: team.id,
    createdAllocations,
    assessmentCount,
  };
}

export async function seedPeerAssessmentProgressScenarios(context: SeedContext) {
  return withSeedLogging("seedPeerAssessmentProgressScenarios", async () => {
    const module = context.modules[0];
    const template = context.templates[0];
    if (!module || !template) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (missing module/template)",
      };
    }

    const enterpriseAdmins = await prisma.user.findMany({
      where: {
        enterpriseId: context.enterprise.id,
        role: { in: [Role.ADMIN, Role.ENTERPRISE_ADMIN] },
      },
      select: { id: true },
    });

    const fallbackAdmin = context.users.find((user) => user.role === Role.ADMIN);
    const adminIds = uniqueUserIds([
      ...enterpriseAdmins.map((user) => user.id),
      ...(fallbackAdmin ? [fallbackAdmin.id] : []),
    ]);
    if (adminIds.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no admin user found)",
      };
    }

    const studentIds = context.usersByRole.students.slice(0, 3).map((user) => user.id);
    const memberIds = uniqueUserIds([...adminIds, ...studentIds]);
    if (memberIds.length < 2) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (not enough team members)",
      };
    }

    const questionLabels = await getTemplateQuestionLabels(template.id, template.questionLabels);

    const assessmentOpen = await seedAssessmentOpenScenario(
      context.enterprise.id,
      module.id,
      template.id,
      memberIds,
      questionLabels
    );
    const feedbackPending = await seedFeedbackPendingScenario(
      context.enterprise.id,
      module.id,
      template.id,
      memberIds,
      questionLabels
    );

    return {
      value: {
        assessmentOpenProjectId: assessmentOpen.projectId,
        feedbackPendingProjectId: feedbackPending.projectId,
      },
      rows: 2,
      details: `projects=2, teams=2, assessments=${feedbackPending.assessmentCount}, allocations=${assessmentOpen.createdAllocations + feedbackPending.createdAllocations}`,
    };
  });
}
