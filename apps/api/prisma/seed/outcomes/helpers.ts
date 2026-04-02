import { randSentence } from "@ngneat/falso";
import { Role } from "@prisma/client";
import { SEED_STUDENT_MARK_COVERAGE, SEED_STUDENT_MARK_MAX, SEED_STUDENT_MARK_MIN } from "../config";
import { prisma } from "../prismaClient";
import type { SeedContext, SeedProject, SeedTeam, SeedTemplate } from "../types";
import { SEED_FEATURE_FLAG_COUNT, SEED_PEER_REVIEWS_PER_MEMBER } from "../volumes";

type PeerAssessmentState = {
  reviewSpan: number;
  assessmentIdByPair: Map<string, number>;
  feedbackIds: Set<number>;
};

export function getProjectsWithExistingDeadlines(projects: SeedProject[]) {
  const projectIds = projects.map((project) => project.id);
  return prisma.projectDeadline
    .findMany({ where: { projectId: { in: projectIds } }, select: { projectId: true } })
    .then((rows) => new Set(rows.map((row) => row.projectId)));
}

export async function upsertProjectDeadlines(projects: SeedProject[], existingProjectIds: Set<number>) {
  let createdCount = 0;
  const now = new Date();
  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index]!;
    if (!existingProjectIds.has(project.id)) createdCount += 1;
    await prisma.projectDeadline.upsert({
      where: { projectId: project.id },
      update: buildProjectDeadlineWrite(now, index),
      create: { projectId: project.id, ...buildProjectDeadlineWrite(now, index) },
    });
  }
  return createdCount;
}

export function buildAssessmentLookup(projects: SeedProject[], templates: SeedTemplate[]) {
  return {
    projectTemplateMap: new Map(projects.map((project) => [project.id, project.templateId])),
    templateMap: new Map(templates.map((template) => [template.id, template])),
  };
}

export async function seedPeerAssessmentsForTeam(
  team: SeedTeam,
  projectTemplateMap: Map<number, number>,
  templateMap: Map<number, SeedTemplate>
) {
  const template = resolveTeamTemplate(team.projectId, projectTemplateMap, templateMap);
  if (!template) return { createdAssessments: 0, createdFeedbacks: 0 };

  const memberIds = await findTeamMemberIds(team.id);
  if (memberIds.length < 2) return { createdAssessments: 0, createdFeedbacks: 0 };

  const state = await getPeerAssessmentTeamState(team, memberIds);
  return seedTeamPeerReviewPairs(team, memberIds, template, state);
}

export function getDefaultFeatureFlags() {
  return [
    { key: "peer_feedback", label: "Peer feedback", enabled: true },
    { key: "modules", label: "Modules", enabled: true },
    { key: "repos", label: "Repositories", enabled: true },
    { key: "dashboards", label: "Dashboards", enabled: true },
    { key: "meetings", label: "Meetings", enabled: true },
    { key: "questionnaires", label: "Questionnaires", enabled: true },
    { key: "github_sync", label: "Github Sync", enabled: true },
    { key: "team_overrides", label: "Team Overrides", enabled: true },
  ].slice(0, SEED_FEATURE_FLAG_COUNT);
}

export function findExistingFeatureFlagKeys(enterpriseId: string, keys: string[]) {
  return prisma.featureFlag
    .findMany({ where: { enterpriseId, key: { in: keys } }, select: { key: true } })
    .then((rows) => new Set(rows.map((row) => row.key)));
}

export async function upsertFeatureFlags(
  enterpriseId: string,
  flags: Array<{ key: string; label: string; enabled: boolean }>
) {
  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { enterpriseId_key: { enterpriseId, key: flag.key } },
      update: { label: flag.label, enabled: flag.enabled },
      create: { ...flag, enterpriseId },
    });
  }
}

export async function getStaffStudentMarksReadiness(context: SeedContext) {
  const teamIds = context.teams.map((team) => team.id);
  if (teamIds.length === 0) return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (no teams)" } };

  const fallbackMarker = context.usersByRole.adminOrStaff[0];
  if (!fallbackMarker) {
    return {
      ready: false as const,
      result: { value: undefined, rows: 0, details: "skipped (no staff/admin marker available)" },
    };
  }

  const moduleIds = context.modules.map((module) => module.id);
  const [teamAllocations, moduleLeads, moduleTeachingAssistants] = await Promise.all([
    findTeamAllocationsForMarks(teamIds),
    prisma.moduleLead.findMany({ where: { moduleId: { in: moduleIds } }, select: { moduleId: true, userId: true } }),
    prisma.moduleTeachingAssistant.findMany({ where: { moduleId: { in: moduleIds } }, select: { moduleId: true, userId: true } }),
  ]);
  return { ready: true as const, fallbackMarker, teamAllocations, moduleLeads, moduleTeachingAssistants };
}

export async function getSafeStudentAllocationCandidates(
  teamAllocations: Awaited<ReturnType<typeof findTeamAllocationsForMarks>>
) {
  const studentCandidates = teamAllocations.filter((allocation) => allocation.user.role === Role.STUDENT);
  const uniqueCandidateIds = Array.from(new Set(studentCandidates.map((allocation) => allocation.userId)));
  const confirmedStudentIds = await findConfirmedStudentIds(uniqueCandidateIds);
  return studentCandidates.filter((allocation) => confirmedStudentIds.has(allocation.userId));
}

export function scopeStudentMarkCandidates(candidates: Array<{ teamId: number; userId: number }>) {
  const coverageCount = Math.floor(candidates.length * SEED_STUDENT_MARK_COVERAGE);
  const targetCount = SEED_STUDENT_MARK_COVERAGE > 0 ? Math.max(1, coverageCount) : 0;
  return targetCount > 0 ? candidates.slice(0, targetCount) : [];
}

export function buildStaffPoolByModuleId(
  moduleLeads: Array<{ moduleId: number; userId: number }>,
  moduleTeachingAssistants: Array<{ moduleId: number; userId: number }>
) {
  const staffPoolByModuleId = new Map<number, number[]>();
  for (const assignment of moduleLeads) addModuleStaffToPool(staffPoolByModuleId, assignment.moduleId, assignment.userId);
  for (const assignment of moduleTeachingAssistants) addModuleStaffToPool(staffPoolByModuleId, assignment.moduleId, assignment.userId);
  return staffPoolByModuleId;
}

export function buildStaffStudentMarkRows(
  candidates: Array<{ teamId: number; userId: number }>,
  staffPoolByModuleId: Map<number, number[]>,
  fallbackMarkerId: number,
  context: SeedContext
) {
  const projectModuleMap = new Map(context.projects.map((project) => [project.id, project.moduleId]));
  const teamProjectMap = new Map(context.teams.map((team) => [team.id, team.projectId]));
  return candidates.map((candidate, index) => {
    const markerUserId = resolveMarkerUserId(candidate.teamId, candidate.userId, index, teamProjectMap, projectModuleMap, staffPoolByModuleId, fallbackMarkerId);
    return {
      teamId: candidate.teamId,
      studentUserId: candidate.userId,
      markerUserId,
      mark: buildSeedStudentMark(SEED_STUDENT_MARK_MIN, SEED_STUDENT_MARK_MAX, index, candidate.userId),
      formativeFeedback: normalizeSentence(randSentence({ length: { min: 7, max: 12 } })),
    };
  });
}

function buildProjectDeadlineWrite(now: Date, index: number) {
  const taskOpen = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
  const taskDue = new Date(taskOpen.getTime() + 7 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 1 * 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 3 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 1 * 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 3 * 24 * 60 * 60 * 1000);
  return { taskOpenDate: taskOpen, taskDueDate: taskDue, assessmentOpenDate: assessmentOpen, assessmentDueDate: assessmentDue, feedbackOpenDate: feedbackOpen, feedbackDueDate: feedbackDue };
}

function resolveTeamTemplate(projectId: number, projectTemplateMap: Map<number, number>, templateMap: Map<number, SeedTemplate>) {
  const templateId = projectTemplateMap.get(projectId);
  return templateId ? templateMap.get(templateId) ?? null : null;
}

function findTeamMemberIds(teamId: number) {
  return prisma.teamAllocation
    .findMany({ where: { teamId }, include: { user: true }, orderBy: { userId: "asc" } })
    .then((rows) => rows.map((row) => row.user.id));
}

async function getPeerAssessmentTeamState(team: SeedTeam, memberIds: number[]): Promise<PeerAssessmentState> {
  const existingAssessments = await prisma.peerAssessment.findMany({
    where: { projectId: team.projectId, teamId: team.id },
    select: { id: true, reviewerUserId: true, revieweeUserId: true },
  });
  const assessmentIdByPair = new Map(
    existingAssessments.map((assessment) => [buildReviewPairKey(assessment.reviewerUserId, assessment.revieweeUserId), assessment.id])
  );
  const feedbackIds = await findExistingFeedbackIds(existingAssessments.map((assessment) => assessment.id));
  return { reviewSpan: Math.min(SEED_PEER_REVIEWS_PER_MEMBER, memberIds.length - 1), assessmentIdByPair, feedbackIds };
}

function findExistingFeedbackIds(assessmentIds: number[]) {
  return prisma.peerFeedback
    .findMany({ where: { peerAssessmentId: { in: assessmentIds } }, select: { peerAssessmentId: true } })
    .then((rows) => new Set(rows.map((row) => row.peerAssessmentId)));
}

async function seedTeamPeerReviewPairs(team: SeedTeam, memberIds: number[], template: SeedTemplate, state: PeerAssessmentState) {
  let createdAssessments = 0;
  let createdFeedbacks = 0;
  for (let reviewerIndex = 0; reviewerIndex < memberIds.length; reviewerIndex += 1) {
    const reviewerId = memberIds[reviewerIndex];
    if (!reviewerId) continue;
    const seeded = await seedReviewerPairs(team, memberIds, reviewerIndex, reviewerId, template, state);
    createdAssessments += seeded.createdAssessments;
    createdFeedbacks += seeded.createdFeedbacks;
  }
  return { createdAssessments, createdFeedbacks };
}

async function seedReviewerPairs(
  team: SeedTeam,
  memberIds: number[],
  reviewerIndex: number,
  reviewerId: number,
  template: SeedTemplate,
  state: PeerAssessmentState
) {
  let createdAssessments = 0;
  let createdFeedbacks = 0;
  for (let offset = 1; offset <= state.reviewSpan; offset += 1) {
    const revieweeId = memberIds[(reviewerIndex + offset) % memberIds.length];
    if (!revieweeId) continue;
    const persisted = await upsertPeerAssessmentAndFeedback(team, reviewerId, revieweeId, template, state);
    createdAssessments += persisted.createdAssessment ? 1 : 0;
    createdFeedbacks += persisted.createdFeedback ? 1 : 0;
  }
  return { createdAssessments, createdFeedbacks };
}

async function upsertPeerAssessmentAndFeedback(
  team: SeedTeam,
  reviewerId: number,
  revieweeId: number,
  template: SeedTemplate,
  state: Pick<PeerAssessmentState, "assessmentIdByPair" | "feedbackIds">
) {
  const answersJson = buildAnswersJson(template.questionLabels, reviewerId, revieweeId);
  const pairKey = buildReviewPairKey(reviewerId, revieweeId);
  const existingAssessmentId = state.assessmentIdByPair.get(pairKey);
  const assessment = await writePeerAssessment(team, reviewerId, revieweeId, template.id, answersJson, existingAssessmentId);
  const createdAssessment = !existingAssessmentId;
  if (createdAssessment) state.assessmentIdByPair.set(pairKey, assessment.id);
  const createdFeedback = await upsertPeerFeedback(team.id, assessment.id, reviewerId, revieweeId, state.feedbackIds);
  return { createdAssessment, createdFeedback };
}

function buildAnswersJson(questionLabels: string[], reviewerId: number, revieweeId: number) {
  return Object.fromEntries(
    questionLabels.map((label, questionIndex) => [label, buildAssessmentAnswer(reviewerId, revieweeId, questionIndex)])
  );
}

function writePeerAssessment(
  team: SeedTeam,
  reviewerUserId: number,
  revieweeUserId: number,
  templateId: number,
  answersJson: Record<string, string>,
  existingId?: number
) {
  if (existingId) return prisma.peerAssessment.update({ where: { id: existingId }, data: { templateId, answersJson } });
  return prisma.peerAssessment.create({
    data: { projectId: team.projectId, teamId: team.id, reviewerUserId, revieweeUserId, templateId, answersJson },
  });
}

async function upsertPeerFeedback(
  teamId: number,
  peerAssessmentId: number,
  reviewerUserId: number,
  revieweeUserId: number,
  existingFeedbackIds: Set<number>
) {
  await prisma.peerFeedback.upsert({
    where: { peerAssessmentId },
    update: { reviewText: buildFeedbackText(reviewerUserId, revieweeUserId), agreementsJson: buildAgreementPayload(reviewerUserId, revieweeUserId) },
    create: {
      teamId,
      peerAssessmentId,
      reviewerUserId,
      revieweeUserId,
      reviewText: buildFeedbackText(reviewerUserId, revieweeUserId),
      agreementsJson: buildAgreementPayload(reviewerUserId, revieweeUserId),
    },
  });
  const created = !existingFeedbackIds.has(peerAssessmentId);
  if (created) existingFeedbackIds.add(peerAssessmentId);
  return created;
}

function findTeamAllocationsForMarks(teamIds: number[]) {
  return prisma.teamAllocation.findMany({
    where: { teamId: { in: teamIds } },
    select: { teamId: true, userId: true, user: { select: { role: true } } },
  });
}

function findConfirmedStudentIds(candidateIds: number[]) {
  return prisma.user
    .findMany({ where: { id: { in: candidateIds }, role: Role.STUDENT }, select: { id: true } })
    .then((rows) => new Set(rows.map((row) => row.id)));
}

function addModuleStaffToPool(poolByModuleId: Map<number, number[]>, moduleId: number, userId: number) {
  const pool = poolByModuleId.get(moduleId) ?? [];
  if (!pool.includes(userId)) pool.push(userId);
  poolByModuleId.set(moduleId, pool);
}

function resolveMarkerUserId(
  teamId: number,
  studentUserId: number,
  index: number,
  teamProjectMap: Map<number, number>,
  projectModuleMap: Map<number, number>,
  staffPoolByModuleId: Map<number, number[]>,
  fallbackMarkerId: number
) {
  const projectId = teamProjectMap.get(teamId);
  const moduleId = projectId ? projectModuleMap.get(projectId) : undefined;
  const modulePool = moduleId ? staffPoolByModuleId.get(moduleId) : undefined;
  if (!modulePool?.length) return fallbackMarkerId;
  return modulePool[(index + studentUserId) % modulePool.length];
}

function buildSeedStudentMark(minMark: number, maxMark: number, index: number, studentUserId: number) {
  const low = Math.min(minMark, maxMark);
  const high = Math.max(minMark, maxMark);
  const span = Math.max(1, high - low + 1);
  return low + ((index + studentUserId) % span);
}

function normalizeSentence(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "Steady contribution and reliable collaboration across project work.";
  const sentence = raw.replace(/\s+/g, " ").trim();
  return sentence.length > 0 ? sentence : "Steady contribution and reliable collaboration across project work.";
}

function buildReviewPairKey(reviewerId: number, revieweeId: number) {
  return `${reviewerId}:${revieweeId}`;
}

function buildAssessmentAnswer(reviewerId: number, revieweeId: number, questionIndex: number) {
  const score = (reviewerId + revieweeId + questionIndex) % 5;
  const tones = ["Needs support", "Developing", "Solid", "Strong", "Outstanding"];
  return `${tones[score]} contribution observed during sprint work and collaboration.`;
}

function buildFeedbackText(reviewerId: number, revieweeId: number) {
  return `Reviewer ${reviewerId} noted that teammate ${revieweeId} contributed consistently, communicated blockers early, and supported delivery across shared tasks.`;
}

function buildAgreementPayload(reviewerId: number, revieweeId: number) {
  return {
    communication: (reviewerId + revieweeId) % 2 === 0,
    contributionVisible: true,
    wouldWorkAgain: (reviewerId + revieweeId) % 3 !== 0,
    followUpNeeded: (reviewerId + revieweeId) % 5 === 0,
  };
}
