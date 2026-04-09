import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEV_ADMIN_EMAIL = "admin@kcl.ac.uk";

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
  const existing = await findScenarioProject(enterpriseId, name);
  const data = buildScenarioProjectWrite(moduleId, templateId, informationText, name);
  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: { moduleId: data.moduleId, questionnaireTemplateId: data.questionnaireTemplateId, informationText: data.informationText },
      select: { id: true, questionnaireTemplateId: true },
    });
  }

  return prisma.project.create({ data, select: { id: true, questionnaireTemplateId: true } });
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
        deadlineProfile: "STANDARD",
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
      deadlineProfile: "STANDARD",
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
    update: {
      ...dates,
      taskDueDateMcf: dates.taskDueDate,
      assessmentDueDateMcf: dates.assessmentDueDate,
      feedbackDueDateMcf: dates.feedbackDueDate,
    },
    create: {
      projectId,
      ...dates,
      taskDueDateMcf: dates.taskDueDate,
      assessmentDueDateMcf: dates.assessmentDueDate,
      feedbackDueDateMcf: dates.feedbackDueDate,
    },
  });
}

async function resetScenarioDeadlineOverrides(projectId: number, teamId: number, memberIds: number[]) {
  await prisma.teamDeadlineOverride.deleteMany({
    where: { teamId },
  });

  const deadline = await prisma.projectDeadline.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (!deadline) return;

  await prisma.studentDeadlineOverride.deleteMany({
    where: {
      projectDeadlineId: deadline.id,
      userId: { in: memberIds },
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
  questionLabels: string[]
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
      questionLabels
    );
    const feedbackPending = await seedFeedbackPendingScenario(
      context.enterprise.id,
      target.module.id,
      target.template.id,
      target.memberIds,
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

function findScenarioProject(enterpriseId: string, name: string) {
  return prisma.project.findFirst({
    where: { name, module: { enterpriseId } },
    select: { id: true },
  });
}

function buildScenarioProjectWrite(moduleId: number, templateId: number, informationText: string, name: string) {
  return { name, moduleId, questionnaireTemplateId: templateId, informationText };
}

async function prepareScenarioTeam(input: {
  enterpriseId: string;
  moduleId: number;
  templateId: number;
  projectName: string;
  teamName: string;
  informationText: string;
  deadlineOffsetDays: { taskOpen: number; taskDue: number; assessmentOpen: number; assessmentDue: number; feedbackOpen: number; feedbackDue: number };
  memberIds: number[];
}) {
  const project = await ensureScenarioProject(input.enterpriseId, input.moduleId, input.templateId, input.projectName, input.informationText);
  const team = await ensureScenarioTeam(input.enterpriseId, project.id, input.teamName);
  const createdAllocations = await ensureTeamAllocations(team.id, input.memberIds);
  await upsertProjectDeadline(project.id, buildScenarioDeadlines(input.deadlineOffsetDays));
  await resetScenarioDeadlineOverrides(project.id, team.id, input.memberIds);
  return { project, team, createdAllocations };
}

function buildScenarioDeadlines(offsetDays: {
  taskOpen: number;
  taskDue: number;
  assessmentOpen: number;
  assessmentDue: number;
  feedbackOpen: number;
  feedbackDue: number;
}) {
  const now = Date.now();
  return {
    taskOpenDate: new Date(now + offsetDays.taskOpen * DAY_MS),
    taskDueDate: new Date(now + offsetDays.taskDue * DAY_MS),
    assessmentOpenDate: new Date(now + offsetDays.assessmentOpen * DAY_MS),
    assessmentDueDate: new Date(now + offsetDays.assessmentDue * DAY_MS),
    feedbackOpenDate: new Date(now + offsetDays.feedbackOpen * DAY_MS),
    feedbackDueDate: new Date(now + offsetDays.feedbackDue * DAY_MS),
  };
}

function clearScenarioPeerData(projectId: number, teamId: number) {
  return Promise.all([
    prisma.peerFeedback.deleteMany({ where: { teamId } }),
    prisma.peerAssessment.deleteMany({ where: { projectId, teamId } }),
  ]);
}

async function upsertScenarioAssessments(
  projectId: number,
  teamId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[]
) {
  let count = 0;
  for (const reviewerUserId of memberIds) {
    for (const revieweeUserId of memberIds) {
      if (reviewerUserId === revieweeUserId) continue;
      await upsertScenarioAssessment(projectId, teamId, templateId, reviewerUserId, revieweeUserId, questionLabels);
      count += 1;
    }
  }
  return count;
}

function upsertScenarioAssessment(
  projectId: number,
  teamId: number,
  templateId: number,
  reviewerUserId: number,
  revieweeUserId: number,
  questionLabels: string[]
) {
  const answersJson = buildAnswersJson(questionLabels, reviewerUserId, revieweeUserId);
  return prisma.peerAssessment.upsert({
    where: {
      projectId_teamId_reviewerUserId_revieweeUserId: { projectId, teamId, reviewerUserId, revieweeUserId },
    },
    update: { templateId, answersJson, submittedLate: false, effectiveDueDate: null },
    create: { projectId, teamId, reviewerUserId, revieweeUserId, templateId, answersJson, submittedLate: false },
  });
}

async function resolveScenarioSeedTarget(context: SeedContext) {
  const module = context.modules[0];
  const template = context.templates[0];
  if (!module || !template) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (missing module/template)" } };
  }

  const devAdmin = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: context.enterprise.id,
        email: DEV_ADMIN_EMAIL,
      },
    },
    select: { id: true },
  });

  // Use the tail of the student pool for demo teams so marker bootstrap users
  // from the head of seed data are not pulled in by default.
  const scenarioStudents = context.usersByRole.students.slice(-4).map((user) => user.id);
  const memberIds = uniqueUserIds([...(devAdmin ? [devAdmin.id] : []), ...scenarioStudents]);
  if (memberIds.length < 2) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (not enough team members)" } };
  }

  return { ready: true as const, module, template, memberIds };
}
