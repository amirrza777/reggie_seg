import { buildAgreementPayload, buildFeedbackText } from "./completed-project/helpers";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEV_ADMIN_EMAIL = "admin@kcl.ac.uk";

const COMPLETED_UNMARKED_PROJECT_NAME = "Completed Unmarked Demo Project";
const COMPLETED_UNMARKED_TEAM_NAME = "Completed Unmarked Demo Team";

function uniqueUserIds(userIds: number[]) {
  return Array.from(new Set(userIds.filter((value) => Number.isInteger(value) && value > 0)));
}

function pickRandomStudentIds(studentIds: number[], count: number) {
  const source = [...studentIds];
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j]!, source[i]!];
  }
  return source.slice(0, Math.min(count, source.length));
}

async function resolveScenarioMemberIds(context: SeedContext) {
  const devAdmin = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: context.enterprise.id,
        email: DEV_ADMIN_EMAIL,
      },
    },
    select: { id: true },
  });

  // Avoid the head of the student pool where marker/demo users are often seeded.
  const studentPool = context.usersByRole.students.slice(-12).map((user) => user.id);
  const randomStudents = pickRandomStudentIds(studentPool, 4);
  const memberIds = uniqueUserIds([...(devAdmin ? [devAdmin.id] : []), ...randomStudents]);
  return memberIds;
}

async function ensureScenarioProject(
  enterpriseId: string,
  moduleId: number,
  templateId: number,
  informationText: string,
) {
  const existing = await prisma.project.findFirst({
    where: { name: COMPLETED_UNMARKED_PROJECT_NAME, module: { enterpriseId } },
    select: { id: true, questionnaireTemplateId: true },
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
      name: COMPLETED_UNMARKED_PROJECT_NAME,
      moduleId,
      questionnaireTemplateId: templateId,
      informationText,
    },
    select: { id: true, questionnaireTemplateId: true },
  });
}

async function ensureScenarioTeam(enterpriseId: string, projectId: number) {
  const existing = await prisma.team.findUnique({
    where: {
      enterpriseId_teamName: {
        enterpriseId,
        teamName: COMPLETED_UNMARKED_TEAM_NAME,
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
      teamName: COMPLETED_UNMARKED_TEAM_NAME,
      allocationLifecycle: "ACTIVE",
      deadlineProfile: "STANDARD",
    },
    select: { id: true },
  });
}

async function syncTeamAllocations(teamId: number, memberIds: number[]) {
  await prisma.teamAllocation.deleteMany({
    where: {
      teamId,
      userId: { notIn: memberIds },
    },
  });

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

async function upsertScenarioDeadline(projectId: number) {
  const now = Date.now();
  await prisma.projectDeadline.upsert({
    where: { projectId },
    update: {
      taskOpenDate: new Date(now - 40 * DAY_MS),
      taskDueDate: new Date(now - 30 * DAY_MS),
      taskDueDateMcf: new Date(now - 30 * DAY_MS),
      assessmentOpenDate: new Date(now - 29 * DAY_MS),
      assessmentDueDate: new Date(now - 20 * DAY_MS),
      assessmentDueDateMcf: new Date(now - 20 * DAY_MS),
      feedbackOpenDate: new Date(now - 19 * DAY_MS),
      feedbackDueDate: new Date(now - 10 * DAY_MS),
      feedbackDueDateMcf: new Date(now - 10 * DAY_MS),
    },
    create: {
      projectId,
      taskOpenDate: new Date(now - 40 * DAY_MS),
      taskDueDate: new Date(now - 30 * DAY_MS),
      taskDueDateMcf: new Date(now - 30 * DAY_MS),
      assessmentOpenDate: new Date(now - 29 * DAY_MS),
      assessmentDueDate: new Date(now - 20 * DAY_MS),
      assessmentDueDateMcf: new Date(now - 20 * DAY_MS),
      feedbackOpenDate: new Date(now - 19 * DAY_MS),
      feedbackDueDate: new Date(now - 10 * DAY_MS),
      feedbackDueDateMcf: new Date(now - 10 * DAY_MS),
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

async function resetScenarioPeerData(projectId: number, teamId: number) {
  await prisma.peerFeedback.deleteMany({ where: { teamId } });
  await prisma.peerAssessment.deleteMany({ where: { projectId, teamId } });
}

async function seedCompletedAssessmentsAndFeedbacks(
  projectId: number,
  teamId: number,
  templateId: number,
  memberIds: number[],
  questionLabels: string[],
) {
  let assessmentCount = 0;
  let feedbackCount = 0;

  for (const reviewerUserId of memberIds) {
    for (const revieweeUserId of memberIds) {
      if (reviewerUserId === revieweeUserId) continue;

      const assessment = await prisma.peerAssessment.upsert({
        where: {
          projectId_teamId_reviewerUserId_revieweeUserId: {
            projectId,
            teamId,
            reviewerUserId,
            revieweeUserId,
          },
        },
        update: {
          templateId,
          answersJson: buildAnswersJson(questionLabels, reviewerUserId, revieweeUserId),
          submittedLate: false,
          effectiveDueDate: null,
        },
        create: {
          projectId,
          teamId,
          reviewerUserId,
          revieweeUserId,
          templateId,
          answersJson: buildAnswersJson(questionLabels, reviewerUserId, revieweeUserId),
          submittedLate: false,
        },
        select: { id: true },
      });
      assessmentCount += 1;

      await prisma.peerFeedback.upsert({
        where: { peerAssessmentId: assessment.id },
        update: {
          teamId,
          reviewerUserId,
          revieweeUserId,
          reviewText: buildFeedbackText(reviewerUserId, revieweeUserId),
          agreementsJson: buildAgreementPayload(reviewerUserId, revieweeUserId, questionLabels),
          submittedLate: false,
        },
        create: {
          teamId,
          peerAssessmentId: assessment.id,
          reviewerUserId,
          revieweeUserId,
          reviewText: buildFeedbackText(reviewerUserId, revieweeUserId),
          agreementsJson: buildAgreementPayload(reviewerUserId, revieweeUserId, questionLabels),
          submittedLate: false,
        },
      });
      feedbackCount += 1;
    }
  }

  return { assessmentCount, feedbackCount };
}

async function clearScenarioMarks(teamId: number) {
  const [teamMarkings, studentMarkings] = await Promise.all([
    prisma.staffTeamMarking.deleteMany({ where: { teamId } }),
    prisma.staffStudentMarking.deleteMany({ where: { teamId } }),
  ]);

  return teamMarkings.count + studentMarkings.count;
}

export async function seedCompletedUnmarkedStudentViewScenario(
  context: SeedContext,
  moduleId: number,
  templateId: number,
  questionLabels: string[],
) {
  const memberIds = await resolveScenarioMemberIds(context);
  if (memberIds.length < 2) return null;

  const project = await ensureScenarioProject(
    context.enterprise.id,
    moduleId,
    templateId,
    "This scenario represents a finished student project where peer assessment and feedback are complete, deadlines have passed, and staff marking is still pending.",
  );
  const team = await ensureScenarioTeam(context.enterprise.id, project.id);
  const createdAllocations = await syncTeamAllocations(team.id, memberIds);
  await upsertScenarioDeadline(project.id);
  await resetScenarioDeadlineOverrides(project.id, team.id, memberIds);
  await resetScenarioPeerData(project.id, team.id);
  const seeded = await seedCompletedAssessmentsAndFeedbacks(project.id, team.id, templateId, memberIds, questionLabels);
  const clearedMarkings = await clearScenarioMarks(team.id);

  return {
    projectId: project.id,
    teamId: team.id,
    memberCount: memberIds.length,
    createdAllocations,
    assessmentCount: seeded.assessmentCount,
    feedbackCount: seeded.feedbackCount,
    clearedMarkings,
  };
}
