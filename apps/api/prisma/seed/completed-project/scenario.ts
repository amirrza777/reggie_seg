import { Role } from "@prisma/client";
import { prisma } from "../prismaClient";
import type { SeedContext } from "../types";
import {
  buildAgreementPayload,
  buildFeedbackText,
  buildReviewPairKey,
  buildScenarioAnswer,
  DAY_MS,
  SCENARIO_PROJECT_NAME,
  SCENARIO_TEAM_NAME,
  type ScenarioQuestion,
} from "./helpers";
import { ensureScenarioMeetings } from "./meetings";

type ScenarioSeedResult = { rows: number; details: string } | { skippedReason: string };

export async function runCompletedProjectScenario(context: SeedContext): Promise<ScenarioSeedResult> {
  const setupInput = await resolveScenarioSetupInput(context);
  if (!setupInput) return { skippedReason: "missing module/template/marker" };
  if (setupInput.memberIds.length < 2) return { skippedReason: "not enough team members for scenario" };
  const setup = await resolveScenarioSetup(setupInput);

  const allocationsCreated = await ensureScenarioAllocations(setup.team.id, setup.memberIds);
  const deadlineCreated = await ensureScenarioDeadline(setup.project.id);
  const questions = await resolveScenarioQuestions(setup.project.questionnaireTemplateId, context.templates[0]!.questionLabels);
  const assessmentResult = await seedScenarioAssessments(setup.project.id, setup.team.id, setup.memberIds, setup.project.questionnaireTemplateId, questions);
  const markingResult = await seedScenarioMarkings(setup.team.id, setup.memberIds, setup.marker.id, context.usersByRole.students.map((student) => student.id));
  const meetingResult = await ensureScenarioMeetings(setup.team.id, setup.memberIds[0] ?? setup.marker.id, setup.memberIds);

  const rows = setup.createdProject + setup.createdTeam + allocationsCreated + deadlineCreated + assessmentResult.rows + markingResult.rows + meetingResult.createdMeetings + meetingResult.createdMinutes + meetingResult.createdAttendances;
  return { rows, details: `project=${setup.project.id}, team=${setup.team.id}, members=${setup.memberIds.length}` };
}

async function resolveScenarioSetupInput(context: SeedContext) {
  const module = context.modules[0];
  const template = context.templates[0];
  const marker = context.usersByRole.adminOrStaff[0];
  if (!module || !template || !marker) return null;
  const memberIds = await resolveScenarioMembers(context);
  return { enterpriseId: context.enterprise.id, moduleId: module.id, templateId: template.id, marker, memberIds };
}

async function resolveScenarioSetup(setupInput: {
  enterpriseId: string;
  moduleId: number;
  templateId: number;
  marker: { id: number };
  memberIds: number[];
}) {
  const projectSeed = await upsertScenarioProject(setupInput.enterpriseId, setupInput.moduleId, setupInput.templateId);
  const teamSeed = await upsertScenarioTeam(setupInput.enterpriseId, projectSeed.project.id);
  return {
    marker: setupInput.marker,
    memberIds: setupInput.memberIds,
    project: projectSeed.project,
    team: teamSeed.team,
    createdProject: projectSeed.createdProject,
    createdTeam: teamSeed.createdTeam,
  };
}

async function resolveScenarioMembers(context: SeedContext) {
  const enterpriseAdmins = await prisma.user.findMany({
    where: { enterpriseId: context.enterprise.id, role: { in: [Role.ADMIN, Role.ENTERPRISE_ADMIN] } },
    select: { id: true },
  });
  return Array.from(new Set([...context.usersByRole.students.slice(0, 4).map((user) => user.id), ...enterpriseAdmins.map((user) => user.id)]));
}

async function upsertScenarioProject(enterpriseId: string, moduleId: number, questionnaireTemplateId: number) {
  const existingProject = await prisma.project.findFirst({
    where: { name: SCENARIO_PROJECT_NAME, module: { enterpriseId } },
    select: { id: true, questionnaireTemplateId: true },
  });
  if (existingProject) return { project: existingProject, createdProject: 0 };
  const project = await prisma.project.create({
    data: {
      name: SCENARIO_PROJECT_NAME,
      informationText: "This completed demo project is seeded for reviewing final outcomes, marks, and feedback history.",
      moduleId,
      questionnaireTemplateId,
    },
    select: { id: true, questionnaireTemplateId: true },
  });
  return { project, createdProject: 1 };
}

async function upsertScenarioTeam(enterpriseId: string, projectId: number) {
  const existingTeam = await prisma.team.findUnique({
    where: { enterpriseId_teamName: { enterpriseId, teamName: SCENARIO_TEAM_NAME } },
    select: { id: true },
  });
  if (existingTeam) {
    const team = await prisma.team.update({ where: { id: existingTeam.id }, data: { projectId }, select: { id: true } });
    return { team, createdTeam: 0 };
  }
  const team = await prisma.team.create({
    data: { enterpriseId, projectId, teamName: SCENARIO_TEAM_NAME },
    select: { id: true },
  });
  return { team, createdTeam: 1 };
}

async function ensureScenarioAllocations(teamId: number, memberIds: number[]) {
  const existingAllocations = await prisma.teamAllocation.findMany({
    where: { teamId, userId: { in: memberIds } },
    select: { userId: true },
  });
  const existingIds = new Set(existingAllocations.map((allocation) => allocation.userId));
  const allocationsToCreate = memberIds.filter((userId) => !existingIds.has(userId)).map((userId) => ({ teamId, userId }));
  if (allocationsToCreate.length > 0) await prisma.teamAllocation.createMany({ data: allocationsToCreate, skipDuplicates: true });
  return allocationsToCreate.length;
}

async function ensureScenarioDeadline(projectId: number) {
  const deadline = await prisma.projectDeadline.findUnique({ where: { projectId }, select: { id: true } });
  if (deadline) return 0;
  const now = Date.now();
  await prisma.projectDeadline.create({
    data: {
      projectId,
      taskOpenDate: new Date(now - 45 * DAY_MS),
      taskDueDate: new Date(now - 35 * DAY_MS),
      assessmentOpenDate: new Date(now - 34 * DAY_MS),
      assessmentDueDate: new Date(now - 28 * DAY_MS),
      feedbackOpenDate: new Date(now - 27 * DAY_MS),
      feedbackDueDate: new Date(now - 20 * DAY_MS),
    },
  });
  return 1;
}

async function resolveScenarioQuestions(templateId: number, fallbackLabels: string[]): Promise<ScenarioQuestion[]> {
  const scenarioQuestions = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { id: true, label: true, type: true, order: true, configs: true },
  });
  if (scenarioQuestions.length > 0) return scenarioQuestions;
  return fallbackLabels.map((label, index) => ({ id: index + 1, label, type: "text", order: index + 1, configs: null }));
}

async function seedScenarioAssessments(projectId: number, teamId: number, memberIds: number[], templateId: number, questions: ScenarioQuestion[]) {
  const existing = await prisma.peerAssessment.findMany({ where: { projectId, teamId }, select: { id: true, reviewerUserId: true, revieweeUserId: true } });
  const assessmentIdByPair = new Map(existing.map((assessment) => [buildReviewPairKey(assessment.reviewerUserId, assessment.revieweeUserId), assessment.id]));
  const existingFeedbackIds = new Set((await prisma.peerFeedback.findMany({ where: { peerAssessmentId: { in: existing.map((a) => a.id) } }, select: { peerAssessmentId: true } })).map((feedback) => feedback.peerAssessmentId));
  return createScenarioAssessments(projectId, teamId, memberIds, templateId, questions, assessmentIdByPair, existingFeedbackIds);
}

async function createScenarioAssessments(
  projectId: number,
  teamId: number,
  memberIds: number[],
  templateId: number,
  questions: ScenarioQuestion[],
  assessmentIdByPair: Map<string, number>,
  existingFeedbackIds: Set<number>,
) {
  let createdAssessments = 0;
  let createdFeedbacks = 0;
  for (const reviewerId of memberIds) {
    if (!reviewerId) continue;
    for (let questionIndex = 0; questionIndex < memberIds.length; questionIndex += 1) {
      const revieweeId = memberIds[questionIndex];
      if (!revieweeId || reviewerId === revieweeId) continue;
      const assessment = await ensureSingleScenarioAssessment(projectId, teamId, templateId, reviewerId, revieweeId, questions, questionIndex, assessmentIdByPair);
      if (!assessment) continue;
      createdAssessments += Number(assessment.created);
      const feedbackCreated = await ensureSingleScenarioFeedback(teamId, reviewerId, revieweeId, assessment.id, existingFeedbackIds);
      createdFeedbacks += feedbackCreated;
    }
  }
  return { rows: createdAssessments + createdFeedbacks };
}

async function ensureSingleScenarioAssessment(
  projectId: number,
  teamId: number,
  templateId: number,
  reviewerId: number,
  revieweeId: number,
  questions: ScenarioQuestion[],
  questionIndex: number,
  assessmentIdByPair: Map<string, number>,
) {
  const answersJson = Object.fromEntries(questions.map((question) => [question.label, buildScenarioAnswer(question, reviewerId, revieweeId, questionIndex)]));
  const pairKey = buildReviewPairKey(reviewerId, revieweeId);
  const existingAssessmentId = assessmentIdByPair.get(pairKey);
  if (existingAssessmentId) {
    const assessment = await prisma.peerAssessment.findUnique({ where: { id: existingAssessmentId }, select: { id: true } });
    return assessment ? { id: assessment.id, created: false } : null;
  }
  const created = await prisma.peerAssessment.create({
    data: { projectId, teamId, reviewerUserId: reviewerId, revieweeUserId: revieweeId, templateId, answersJson, submittedLate: false },
    select: { id: true },
  });
  assessmentIdByPair.set(pairKey, created.id);
  return { id: created.id, created: true };
}

async function ensureSingleScenarioFeedback(teamId: number, reviewerId: number, revieweeId: number, assessmentId: number, existingFeedbackIds: Set<number>) {
  if (existingFeedbackIds.has(assessmentId)) return 0;
  await prisma.peerFeedback.create({
    data: {
      teamId,
      peerAssessmentId: assessmentId,
      reviewerUserId: reviewerId,
      revieweeUserId: revieweeId,
      reviewText: buildFeedbackText(reviewerId, revieweeId),
      agreementsJson: buildAgreementPayload(reviewerId, revieweeId),
      submittedLate: false,
    },
  });
  existingFeedbackIds.add(assessmentId);
  return 1;
}

async function seedScenarioMarkings(teamId: number, memberIds: number[], markerId: number, studentIds: number[]) {
  const teamMarkingCreated = await ensureTeamMarking(teamId, markerId);
  const studentMarksCreated = await ensureStudentMarkings(teamId, memberIds, markerId, studentIds);
  return { rows: teamMarkingCreated + studentMarksCreated };
}

async function ensureTeamMarking(teamId: number, markerId: number) {
  const teamMarking = await prisma.staffTeamMarking.findUnique({ where: { teamId }, select: { id: true } });
  if (teamMarking) return 0;
  await prisma.staffTeamMarking.create({
    data: {
      teamId,
      markerUserId: markerId,
      mark: 78,
      formativeFeedback: "Completed project with strong delivery quality and clear team coordination.",
    },
  });
  return 1;
}

async function ensureStudentMarkings(teamId: number, memberIds: number[], markerId: number, studentIds: number[]) {
  const studentIdSet = new Set(studentIds);
  const studentMemberIds = memberIds.filter((memberId) => studentIdSet.has(memberId));
  const existingStudentMarks = await prisma.staffStudentMarking.findMany({
    where: { teamId, studentUserId: { in: studentMemberIds } },
    select: { studentUserId: true },
  });
  const markedStudentIds = new Set(existingStudentMarks.map((record) => record.studentUserId));
  const studentMarksToCreate = studentMemberIds
    .filter((studentUserId) => !markedStudentIds.has(studentUserId))
    .map((studentUserId, index) => ({
      teamId,
      studentUserId,
      markerUserId: markerId,
      mark: 70 + ((index + studentUserId) % 20),
      formativeFeedback: "Consistent contribution across implementation, communication, and team collaboration.",
    }));
  if (studentMarksToCreate.length > 0) await prisma.staffStudentMarking.createMany({ data: studentMarksToCreate, skipDuplicates: true });
  return studentMarksToCreate.length;
}
