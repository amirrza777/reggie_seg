import { prisma } from "../prismaClient";
import type { SeedContext } from "../types";
import { PROJECT_NAME, SE_MODULE_NAME_FRAGMENT, SEEDED_MESSAGE_SUBJECT_PREFIX } from "./constants";
import { toDateFromNow } from "./time";
import type { TeamHealthMessageRow } from "./types";

function deleteScenarioTeamHealthMessages(projectId: number, teamId: number) {
  return prisma.teamHealthMessage.deleteMany({ where: { projectId, teamId } });
}

export function buildOpenScenarioMessages(projectId: number, teamId: number, requesterId: number) {
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

export function buildResolvedScenarioMessage(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
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

export function buildScenarioTeamHealthMessageRows(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
  return [...buildOpenScenarioMessages(projectId, teamId, requesterId), buildResolvedScenarioMessage(projectId, teamId, requesterId, reviewerId)];
}

function insertScenarioTeamHealthMessages(rows: TeamHealthMessageRow[]) {
  return prisma.teamHealthMessage.createMany({ data: rows });
}

export async function seedTeamHealthMessages(projectId: number, teamId: number, requesterId: number, reviewerId: number | null) {
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

export async function seedExistingSeTeamHealthMessages(
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
