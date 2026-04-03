import { Role } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROJECT_NAME = "Team Health Warning Demo Project";
const TEAM_NAME = "Team Health Warning Demo Team";
const SE_MODULE_NAME_FRAGMENT = "Software Engineering Group Project";
const SEEDED_MESSAGE_SUBJECT_PREFIX = "[Seed Team Health]";

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
  await prisma.projectDeadline.upsert({
    where: { projectId },
    update: {
      taskOpenDate: toDateFromNow(-24),
      taskDueDate: toDateFromNow(-16),
      assessmentOpenDate: toDateFromNow(-14),
      assessmentDueDate: toDateFromNow(-3),
      feedbackOpenDate: toDateFromNow(-1),
      feedbackDueDate: toDateFromNow(4),
    },
    create: {
      projectId,
      taskOpenDate: toDateFromNow(-24),
      taskDueDate: toDateFromNow(-16),
      assessmentOpenDate: toDateFromNow(-14),
      assessmentDueDate: toDateFromNow(-3),
      feedbackOpenDate: toDateFromNow(-1),
      feedbackDueDate: toDateFromNow(4),
    },
  });
}

async function seedTeamHealthMessages(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
  await prisma.teamHealthMessage.deleteMany({
    where: { projectId, teamId },
  });

  const createdAtOpen = toDateFromNow(-2);
  const createdAtOpenOlder = toDateFromNow(-4);
  const createdAtOpenOldest = toDateFromNow(-9);
  const createdAtResolved = toDateFromNow(-6);
  const reviewedAtResolved = toDateFromNow(-5);

  await prisma.teamHealthMessage.createMany({
    data: [
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
        details:
          "The team has uncertainty around ownership boundaries and review responsibilities after the last sprint handover.",
        resolved: false,
        responseText: null,
        reviewedByUserId: null,
        createdAt: createdAtOpenOldest,
        updatedAt: createdAtOpenOldest,
        reviewedAt: null,
      },
      {
        projectId,
        teamId,
        requesterUserId: requesterId,
        subject: `${SEEDED_MESSAGE_SUBJECT_PREFIX} Earlier concern about uneven contribution`,
        details:
          "Raised a concern about uneven contribution. Team has now redistributed tasks and improved communication.",
        resolved: true,
        responseText: "Thanks for raising this. Keep tracking ownership in meetings and check in weekly.",
        reviewedByUserId: reviewerId,
        createdAt: createdAtResolved,
        updatedAt: reviewedAtResolved,
        reviewedAt: reviewedAtResolved,
      },
    ],
  });
}

async function seedExistingSeTeamHealthMessages(
  context: SeedContext,
  fallbackRequesterId: number,
  reviewerId: number | null
) {
  const existingProject = await prisma.project.findFirst({
    where: {
      module: {
        enterpriseId: context.enterprise.id,
        name: { contains: SE_MODULE_NAME_FRAGMENT },
      },
      NOT: { name: PROJECT_NAME },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!existingProject) return { seeded: false as const };

  const existingTeam = await prisma.team.findFirst({
    where: {
      projectId: existingProject.id,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!existingTeam) return { seeded: false as const };

  const allocation = await prisma.teamAllocation.findFirst({
    where: { teamId: existingTeam.id },
    orderBy: { userId: "asc" },
    select: { userId: true },
  });
  const requesterId = allocation?.userId ?? fallbackRequesterId;

  await prisma.teamHealthMessage.deleteMany({
    where: {
      projectId: existingProject.id,
      teamId: existingTeam.id,
      subject: { startsWith: SEEDED_MESSAGE_SUBJECT_PREFIX },
    },
  });

  const createdAtOpen = toDateFromNow(-3);
  const createdAtResolved = toDateFromNow(-8);
  const reviewedAtResolved = toDateFromNow(-7);

  await prisma.teamHealthMessage.createMany({
    data: [
      {
        projectId: existingProject.id,
        teamId: existingTeam.id,
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
        projectId: existingProject.id,
        teamId: existingTeam.id,
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
    ],
  });

  return { seeded: true as const, projectId: existingProject.id, teamId: existingTeam.id };
}

export async function seedTeamHealthWarningScenario(context: SeedContext) {
  return withSeedLogging("seedTeamHealthWarningScenario", async () => {
    const moduleId = await resolveScenarioModuleId(context);
    const templateId = context.templates[0]?.id ?? null;
    if (!moduleId || !templateId) {
      return { value: undefined, rows: 0, details: "skipped (missing module/template)" };
    }

    const enterpriseAdmins = await prisma.user.findMany({
      where: {
        enterpriseId: context.enterprise.id,
        role: { in: [Role.ADMIN, Role.ENTERPRISE_ADMIN] },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const fallbackRequester = context.usersByRole.students[0]?.id ?? null;
    const fallbackReviewer = context.usersByRole.adminOrStaff[0]?.id ?? null;
    const requesterId = fallbackRequester ?? enterpriseAdmins[0]?.id ?? null;
    const reviewerId = enterpriseAdmins[0]?.id ?? fallbackReviewer ?? null;
    if (!requesterId) {
      return { value: undefined, rows: 0, details: "skipped (missing requester user)" };
    }

    const memberIds = uniquePositiveUserIds([
      ...enterpriseAdmins.slice(0, 1).map((user) => user.id),
      ...context.usersByRole.students.slice(0, 4).map((user) => user.id),
      requesterId,
    ]);
    if (memberIds.length < 2) {
      return { value: undefined, rows: 0, details: "skipped (not enough team members)" };
    }

    const project = await upsertScenarioProject(context, moduleId, templateId);
    const team = await upsertScenarioTeam(context, project.id);
    await ensureTeamAllocations(team.id, memberIds);
    await upsertScenarioDeadline(project.id);
    await seedTeamHealthMessages(project.id, team.id, requesterId, reviewerId);
    const existingSeSeed = await seedExistingSeTeamHealthMessages(context, requesterId, reviewerId);
    await prisma.teamWarning.deleteMany({ where: { projectId: project.id, teamId: team.id } });
    const deletedMeetings = await clearTeamMeetings(team.id);

    return {
      value: {
        projectId: project.id,
        teamId: team.id,
      },
      rows: 1,
      details:
        `project=${project.id}, team=${team.id}, members=${memberIds.length}, ` +
        `stage=feedback-open, deletedMeetings=${deletedMeetings}, warningsConfig=3-rules` +
        (existingSeSeed.seeded ? `, existingSeProject=${existingSeSeed.projectId}, existingSeTeam=${existingSeSeed.teamId}` : ""),
    };
  });
}
