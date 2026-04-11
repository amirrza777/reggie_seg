import { resetScenarioDeadlineOverrides } from "../scenarioUtils";
import { prisma } from "../prismaClient";
import { PEER_SCENARIO_DAY_MS } from "./constants";

type ScenarioSetupInput = {
  enterpriseId: string;
  moduleId: number;
  templateId: number;
  projectName: string;
  teamName: string;
  informationText: string;
  deadlineOffsetDays: {
    taskOpen: number;
    taskDue: number;
    assessmentOpen: number;
    assessmentDue: number;
    feedbackOpen: number;
    feedbackDue: number;
  };
  memberIds: number[];
};

function buildScenarioProjectWrite(moduleId: number, templateId: number, informationText: string, name: string) {
  return { name, moduleId, questionnaireTemplateId: templateId, informationText };
}

function findScenarioProject(enterpriseId: string, name: string) {
  return prisma.project.findFirst({
    where: { name, module: { enterpriseId } },
    select: { id: true },
  });
}

async function ensureScenarioProject(enterpriseId: string, moduleId: number, templateId: number, name: string, informationText: string) {
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

function buildScenarioDeadlines(offsetDays: ScenarioSetupInput["deadlineOffsetDays"]) {
  const now = Date.now();
  return {
    taskOpenDate: new Date(now + offsetDays.taskOpen * PEER_SCENARIO_DAY_MS),
    taskDueDate: new Date(now + offsetDays.taskDue * PEER_SCENARIO_DAY_MS),
    assessmentOpenDate: new Date(now + offsetDays.assessmentOpen * PEER_SCENARIO_DAY_MS),
    assessmentDueDate: new Date(now + offsetDays.assessmentDue * PEER_SCENARIO_DAY_MS),
    feedbackOpenDate: new Date(now + offsetDays.feedbackOpen * PEER_SCENARIO_DAY_MS),
    feedbackDueDate: new Date(now + offsetDays.feedbackDue * PEER_SCENARIO_DAY_MS),
  };
}

async function upsertProjectDeadline(projectId: number, dates: ReturnType<typeof buildScenarioDeadlines>) {
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

export async function prepareScenarioTeam(input: ScenarioSetupInput) {
  const project = await ensureScenarioProject(input.enterpriseId, input.moduleId, input.templateId, input.projectName, input.informationText);
  const team = await ensureScenarioTeam(input.enterpriseId, project.id, input.teamName);
  const createdAllocations = await ensureTeamAllocations(team.id, input.memberIds);
  await upsertProjectDeadline(project.id, buildScenarioDeadlines(input.deadlineOffsetDays));
  await resetScenarioDeadlineOverrides(project.id, team.id, input.memberIds);
  return { project, team, createdAllocations };
}
