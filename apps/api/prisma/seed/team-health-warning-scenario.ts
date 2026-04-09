import { Role } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROJECT_NAME = "Team Health Warning Demo Project";
const TEAM_NAME = "Team Health Warning Demo Team";
const SE_MODULE_NAME_FRAGMENT = "Software Engineering Group Project";
const SEEDED_MESSAGE_SUBJECT_PREFIX = "[Seed Team Health]";
const DEV_ADMIN_EMAIL = "admin@kcl.ac.uk";

const WARNING_CONFIG = {
  version: 1 as const,
  rules: [
    {
      key: "LOW_ATTENDANCE",
      enabled: true,
      severity: "HIGH" as const,
      params: {
        minPercent: 70,
        lookbackDays: 30,
      },
    },
    {
      key: "MEETING_FREQUENCY",
      enabled: true,
      severity: "MEDIUM" as const,
      params: {
        minPerWeek: 2,
        lookbackDays: 30,
      },
    },
    {
      key: "LOW_CONTRIBUTION_ACTIVITY",
      enabled: true,
      severity: "MEDIUM" as const,
      params: {
        minCommits: 6,
        lookbackDays: 14,
      },
    },
  ],
};

function uniquePositiveUserIds(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

function toDateFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS);
}

async function resolveScenarioModuleId(context: SeedContext) {
  const preferred = await prisma.module.findFirst({
    where: {
      enterpriseId: context.enterprise.id,
      name: { contains: SE_MODULE_NAME_FRAGMENT },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (preferred) return preferred.id;
  return context.modules[0]?.id ?? null;
}

async function upsertScenarioProject(context: SeedContext, moduleId: number, templateId: number) {
  const existing = await prisma.project.findFirst({
    where: {
      name: PROJECT_NAME,
      module: { enterpriseId: context.enterprise.id },
    },
    select: { id: true },
  });

  const payload = {
    moduleId,
    questionnaireTemplateId: templateId,
    informationText:
      "Temporary UI testing scenario for team health and warnings. This project is intentionally in a late delivery phase " +
      "with feedback currently open so staff can validate warning banners, escalation cards, and team support workflows.",
    warningsConfig: WARNING_CONFIG as unknown as object,
  };

  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: payload,
      select: { id: true },
    });
  }

  return prisma.project.create({
    data: {
      name: PROJECT_NAME,
      ...payload,
    },
    select: { id: true },
  });
}

async function upsertScenarioTeam(context: SeedContext, projectId: number) {
  const existing = await prisma.team.findUnique({
    where: {
      enterpriseId_teamName: {
        enterpriseId: context.enterprise.id,
        teamName: TEAM_NAME,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.team.update({
      where: { id: existing.id },
      data: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
        deadlineProfile: "STANDARD",
      },
      select: { id: true },
    });
  }

  return prisma.team.create({
    data: {
      enterpriseId: context.enterprise.id,
      projectId,
      teamName: TEAM_NAME,
      allocationLifecycle: "ACTIVE",
      deadlineProfile: "STANDARD",
    },
    select: { id: true },
  });
}

async function ensureTeamAllocations(teamId: number, memberIds: number[]) {
  await prisma.teamAllocation.deleteMany({
    where: {
      teamId,
      userId: { notIn: memberIds },
    },
  });

  await prisma.teamAllocation.createMany({
    data: memberIds.map((userId) => ({ teamId, userId })),
    skipDuplicates: true,
  });
}

async function clearTeamMeetings(teamId: number) {
  const meetings = await prisma.meeting.findMany({
    where: { teamId },
    select: { id: true },
  });
  if (meetings.length === 0) return 0;

  const meetingIds = meetings.map((meeting) => meeting.id);
  const comments = await prisma.meetingComment.findMany({
    where: { meetingId: { in: meetingIds } },
    select: { id: true },
  });
  const commentIds = comments.map((comment) => comment.id);
  await prisma.mention.deleteMany({
    where: {
      sourceType: "COMMENT",
      sourceId: { in: commentIds },
    },
  });
  await prisma.meetingAttendance.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meetingParticipant.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meetingMinutes.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meetingComment.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meeting.deleteMany({ where: { id: { in: meetingIds } } });
  return meetingIds.length;
}

async function upsertScenarioDeadline(projectId: number) {
  const taskDueDate = toDateFromNow(-16);
  const assessmentDueDate = toDateFromNow(-3);
  const feedbackDueDate = toDateFromNow(4);

  await prisma.projectDeadline.upsert({
    where: { projectId },
    update: {
      taskOpenDate: toDateFromNow(-24),
      taskDueDate,
      taskDueDateMcf: taskDueDate,
      assessmentOpenDate: toDateFromNow(-14),
      assessmentDueDate,
      assessmentDueDateMcf: assessmentDueDate,
      feedbackOpenDate: toDateFromNow(-1),
      feedbackDueDate,
      feedbackDueDateMcf: feedbackDueDate,
    },
    create: {
      projectId,
      taskOpenDate: toDateFromNow(-24),
      taskDueDate,
      taskDueDateMcf: taskDueDate,
      assessmentOpenDate: toDateFromNow(-14),
      assessmentDueDate,
      assessmentDueDateMcf: assessmentDueDate,
      feedbackOpenDate: toDateFromNow(-1),
      feedbackDueDate,
      feedbackDueDateMcf: feedbackDueDate,
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
  const selector = (reviewerId + revieweeId + label.length) % 3;
  if (selector === 0) return "Consistently contributed and communicated blockers early.";
  if (selector === 1) return "Reliable ownership of tasks and steady delivery updates.";
  return "Helpful collaborator with clear handovers and good meeting engagement.";
}

function buildAnswersJson(questionLabels: string[], reviewerId: number, revieweeId: number) {
  return Object.fromEntries(
    questionLabels.map((label) => [label, buildAssessmentAnswer(label, reviewerId, revieweeId)])
  );
}

async function getTemplateQuestionLabels(templateId: number) {
  const rows = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { label: true },
  });
  if (rows.length > 0) return rows.map((row) => row.label);
  return ["Overall contribution"];
}

async function seedPartialPeerAssessments(
  projectId: number,
  teamId: number,
  templateId: number,
  memberIds: number[],
) {
  await prisma.peerFeedback.deleteMany({ where: { teamId } });
  await prisma.peerAssessment.deleteMany({ where: { projectId, teamId } });

  const questionLabels = await getTemplateQuestionLabels(templateId);
  let created = 0;

  for (let index = 0; index < memberIds.length; index += 1) {
    const reviewerUserId = memberIds[index];
    const revieweeUserId = memberIds[(index + 1) % memberIds.length];
    if (!reviewerUserId || !revieweeUserId || reviewerUserId === revieweeUserId) continue;

    await prisma.peerAssessment.create({
      data: {
        projectId,
        teamId,
        reviewerUserId,
        revieweeUserId,
        templateId,
        answersJson: buildAnswersJson(questionLabels, reviewerUserId, revieweeUserId),
        submittedLate: false,
      },
    });
    created += 1;
  }

  return created;
}

type TeamHealthMessageRow = {
  projectId: number;
  teamId: number;
  requesterUserId: number;
  subject: string;
  details: string;
  resolved: boolean;
  responseText: string | null;
  reviewedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
};

function deleteScenarioTeamHealthMessages(projectId: number, teamId: number) {
  return prisma.teamHealthMessage.deleteMany({ where: { projectId, teamId } });
}

function buildOpenScenarioMessages(projectId: number, teamId: number, requesterId: number) {
  const createdAtOpen = toDateFromNow(-2);
  const createdAtOpenOlder = toDateFromNow(-4);
  const createdAtOpenOldest = toDateFromNow(-9);
  return [
    {
      projectId,
      teamId,
      requesterUserId: requesterId,
      subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Blocked on delivery plan and ownership`,
      details:
        "We are struggling to keep momentum and need staff support to align priorities and ownership before the feedback deadline.",
      resolved: false,
      responseText: null,
      reviewedByUserId: null,
      createdAt: createdAtOpen,
      updatedAt: createdAtOpen,
      reviewedAt: null,
    },
    {
      projectId,
      teamId,
      requesterUserId: requesterId,
      subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Escalation: recurring stand-up absences`,
      details:
        "Two members have repeatedly missed stand-ups and planning updates. We need help agreeing expectations and accountability.",
      resolved: false,
      responseText: null,
      reviewedByUserId: null,
      createdAt: createdAtOpenOlder,
      updatedAt: createdAtOpenOlder,
      reviewedAt: null,
    },
    {
      projectId,
      teamId,
      requesterUserId: requesterId,
      subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Clarification request on task split`,
      details: "The team has uncertainty around ownership boundaries and review responsibilities after the last sprint handover.",
      resolved: false,
      responseText: null,
      reviewedByUserId: null,
      createdAt: createdAtOpenOldest,
      updatedAt: createdAtOpenOldest,
      reviewedAt: null,
    },
  ] satisfies TeamHealthMessageRow[];
}

function buildResolvedScenarioMessage(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
  const createdAtResolved = toDateFromNow(-6);
  const reviewedAtResolved = toDateFromNow(-5);
  return {
    projectId,
    teamId,
    requesterUserId: requesterId,
    subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Earlier concern about uneven contribution`,
    details: "Raised a concern about uneven contribution. Team has now redistributed tasks and improved communication.",
    resolved: true,
    responseText: "Thanks for raising this. Keep tracking ownership in meetings and check in weekly.",
    reviewedByUserId: reviewerId,
    createdAt: createdAtResolved,
    updatedAt: reviewedAtResolved,
    reviewedAt: reviewedAtResolved,
  } satisfies TeamHealthMessageRow;
}

function buildScenarioTeamHealthMessageRows(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
  return [...buildOpenScenarioMessages(projectId, teamId, requesterId), buildResolvedScenarioMessage(projectId, teamId, requesterId, reviewerId)];
}

function insertScenarioTeamHealthMessages(rows: TeamHealthMessageRow[]) {
  return prisma.teamHealthMessage.createMany({ data: rows });
}

async function seedTeamHealthMessages(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
  await deleteScenarioTeamHealthMessages(projectId, teamId);
  const rows = buildScenarioTeamHealthMessageRows(projectId, teamId, requesterId, reviewerId);
  await insertScenarioTeamHealthMessages(rows);
}

function findExistingScenarioProject(enterpriseId: string) {
  return prisma.project.findFirst({
    where: {
      module: { enterpriseId, name: { contains: SE_MODULE_NAME_FRAGMENT } },
      NOT: { name: PROJECT_NAME },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
}

function findExistingScenarioTeam(projectId: number) {
  return prisma.team.findFirst({
    where: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    orderBy: { id: "asc" },
    select: { id: true },
  });
}

async function resolveExistingScenarioRequesterId(teamId: number, fallbackRequesterId: number) {
  const allocation = await prisma.teamAllocation.findFirst({
    where: { teamId },
    orderBy: { userId: "asc" },
    select: { userId: true },
  });
  return allocation?.userId ?? fallbackRequesterId;
}

function deleteExistingScenarioSeededMessages(projectId: number, teamId: number) {
  return prisma.teamHealthMessage.deleteMany({
    where: { projectId, teamId, subject: { startsWith: SEEDED_MESSAGE_SUBJECT_PREFIX } },
  });
}

function buildExistingScenarioMessageRows(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
  const createdAtOpen = toDateFromNow(-3);
  const createdAtResolved = toDateFromNow(-8);
  const reviewedAtResolved = toDateFromNow(-7);
  return [
    {
      projectId,
      teamId,
      requesterUserId: requesterId,
      subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Team requesting intervention`,
      details:
        "We need staff guidance on balancing workload and clarifying responsibilities before the next deadline milestone.",
      resolved: false,
      responseText: null,
      reviewedByUserId: null,
      createdAt: createdAtOpen,
      updatedAt: createdAtOpen,
      reviewedAt: null,
    },
    {
      projectId,
      teamId,
      requesterUserId: requesterId,
      subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Follow-up from previous concern`,
      details: "Previous concern was addressed after staff feedback and a revised team agreement.",
      resolved: true,
      responseText: "Reviewed and acknowledged. Continue tracking with weekly check-ins.",
      reviewedByUserId: reviewerId,
      createdAt: createdAtResolved,
      updatedAt: reviewedAtResolved,
      reviewedAt: reviewedAtResolved,
    },
  ] satisfies TeamHealthMessageRow[];
}

function insertExistingScenarioMessages(rows: TeamHealthMessageRow[]) {
  return prisma.teamHealthMessage.createMany({ data: rows });
}

async function seedExistingSeTeamHealthMessages(
  context: SeedContext,
  fallbackRequesterId: number,
  reviewerId: number | null
) {
  const existingProject = await findExistingScenarioProject(context.enterprise.id);
  if (!existingProject) return { seeded: false as const };

  const existingTeam = await findExistingScenarioTeam(existingProject.id);
  if (!existingTeam) return { seeded: false as const };

  const requesterId = await resolveExistingScenarioRequesterId(existingTeam.id, fallbackRequesterId);
  await deleteExistingScenarioSeededMessages(existingProject.id, existingTeam.id);
  const rows = buildExistingScenarioMessageRows(existingProject.id, existingTeam.id, requesterId, reviewerId);
  await insertExistingScenarioMessages(rows);

  return { seeded: true as const, projectId: existingProject.id, teamId: existingTeam.id };
}

async function resolveScenarioActors(context: SeedContext) {
  const devAdmin = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: context.enterprise.id,
        email: DEV_ADMIN_EMAIL,
      },
    },
    select: { id: true },
  });

  const enterpriseAdmins = await prisma.user.findMany({
    where: { enterpriseId: context.enterprise.id, role: { in: [Role.ADMIN, Role.ENTERPRISE_ADMIN] } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const scenarioStudents = context.usersByRole.students.slice(-4);
  const fallbackRequester = scenarioStudents[0]?.id ?? context.usersByRole.students[0]?.id ?? null;
  const fallbackReviewer = context.usersByRole.adminOrStaff[0]?.id ?? null;
  return {
    enterpriseAdmins,
    requesterId: fallbackRequester ?? devAdmin?.id ?? enterpriseAdmins[0]?.id ?? null,
    reviewerId: devAdmin?.id ?? enterpriseAdmins[0]?.id ?? fallbackReviewer ?? null,
  };
}

function buildScenarioMemberIds(context: SeedContext, requesterId: number, reviewerId: number | null) {
  const scenarioStudents = context.usersByRole.students.slice(-4);
  return uniquePositiveUserIds([
    ...(reviewerId ? [reviewerId] : []),
    ...scenarioStudents.map((user) => user.id),
    requesterId,
  ]);
}

function validateScenarioPrerequisites(moduleId: number | null, templateId: number | null, requesterId: number | null, memberIds: number[]) {
  if (!moduleId || !templateId) return { ok: false as const, details: "skipped (missing module/template)" };
  if (!requesterId) return { ok: false as const, details: "skipped (missing requester user)" };
  if (memberIds.length < 2) return { ok: false as const, details: "skipped (not enough team members)" };
  return { ok: true as const };
}

async function preparePrimaryScenarioTeam(context: SeedContext, moduleId: number, templateId: number, memberIds: number[]) {
  const project = await upsertScenarioProject(context, moduleId, templateId);
  const team = await upsertScenarioTeam(context, project.id);
  await ensureTeamAllocations(team.id, memberIds);
  await upsertScenarioDeadline(project.id);
  await resetScenarioDeadlineOverrides(project.id, team.id, memberIds);
  const seededAssessments = await seedPartialPeerAssessments(project.id, team.id, templateId, memberIds);
  return { project, team, seededAssessments };
}

async function clearPrimaryScenarioWarningsAndMeetings(projectId: number, teamId: number) {
  await prisma.teamWarning.deleteMany({ where: { projectId, teamId } });
  return clearTeamMeetings(teamId);
}

function buildTeamHealthScenarioDetails(
  projectId: number,
  teamId: number,
  memberCount: number,
  seededAssessments: number,
  deletedMeetings: number,
  existingSeSeed: { seeded: true; projectId: number; teamId: number } | { seeded: false },
) {
  const base =
    `project=${projectId}, team=${teamId}, members=${memberCount}, ` +
    `stage=feedback-open, seededAssessments=${seededAssessments}, deletedMeetings=${deletedMeetings}, warningsConfig=3-rules`;
  if (!existingSeSeed.seeded) return base;
  return `${base}, existingSeProject=${existingSeSeed.projectId}, existingSeTeam=${existingSeSeed.teamId}`;
}

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
