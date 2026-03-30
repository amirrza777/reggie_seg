import argon2 from "argon2";
import {
  buildUsersByRole,
  seedAdminTeamAllocation,
  seedGithubE2EUsers,
  seedModuleLeads,
  seedStudentEnrollments,
  seedTeamAllocations,
} from "./allocation";
import { seedCompletedProjectScenario } from "./completed-project";
import { seedModules, seedProjects, seedQuestionnaireTemplates, seedTeams, seedUsers } from "./catalog";
import {
  SEED_COMPLETED_PROJECT_SCENARIO,
  SEED_ENABLE_ADMIN_TEAM_ALLOCATION,
  SEED_PROFILE,
  SEED_USER_PASSWORD,
} from "./config";
import { assertPrismaClientModels, getSeedEnterprises, seedAdminUser } from "./core";
import { seedMarkerUserData } from "./data";
import { seedForumPosts } from "./forum";
import { seedHelpContent } from "./help";
import { planSeedModuleJoinCode } from "./joinCodes";
import { withSeedLogging } from "./logging";
import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines } from "./outcomes";
import { seedPeerAssessmentProgressScenarios } from "./peer-assessment-scenarios";
import { seedMeetings } from "./meetings";
import { seedNotifications } from "./notifications";
import { prisma } from "./prismaClient";
import type { SeedContext, SeedEnterprise } from "./types";
import { SEED_MODULE_COUNT } from "./volumes";

async function main() {
  assertPrismaClientModels();

  const seedPasswordHash = await argon2.hash(SEED_USER_PASSWORD);
  await seedHelpContent();
  const enterprises = await getSeedEnterprises();

  for (const enterprise of enterprises) {
    const context = await buildSeedContext(enterprise, seedPasswordHash);
    await runSeedSteps(context);
  }

  console.log(`Seed users ready across ${enterprises.length} enterprise(s). Default password: ${seedPassword}`);
  console.log(`Seed profile: ${SEED_PROFILE}`);
  console.log("Assessment accounts seeded for project assessment workflows:");
  for (const account of seedMarkerUserData) {
    console.log(`- ${account.email} (${account.role})`);
  }
  console.log("Seeded projects also include generated discussion-forum threads from both staff and student accounts.");
  console.log(`These accounts are intended for project assessment/testing flows. Shared password: ${seedPassword}`);
}

async function buildSeedContext(enterprise: SeedEnterprise, passwordHash: string): Promise<SeedContext> {
  await seedAdminUser(enterprise.id);
  const users = await seedUsers(enterprise.id, passwordHash);
  const usersByRole = buildUsersByRole(users);
  const modules = await seedModules(enterprise.id);
  const templateOwner = usersByRole.adminOrStaff[0];
  const templates = await seedQuestionnaireTemplates(templateOwner?.id);
  const projects = await seedProjects(modules, templates);
  const teams = await seedTeams(enterprise.id, projects);

  return {
    enterprise,
    passwordHash,
    users,
    usersByRole,
    modules,
    templates,
    projects,
    teams,
  };
}

const seedPassword = SEED_USER_PASSWORD;

async function runSeedSteps(context: SeedContext) {
  for (const step of buildSeedStepPlan(context)) {
    await step();
  }
}

function buildSeedStepPlan(context: SeedContext) {
  const steps = [
    () => seedModuleLeads(context.usersByRole.adminOrStaff, context.modules),
    () => seedStudentEnrollments(context.enterprise.id, context.usersByRole.students, context.modules),
    () => seedTeamAllocations(context.usersByRole.students, context.teams),
    () => seedGithubE2EUsers(context.enterprise.id, context.projects, context.teams),
    () => seedProjectDeadlines(context.projects),
    () => seedPeerAssessments(context.projects, context.teams, context.templates),
    () => seedFeatureFlags(context.enterprise.id),
    () => seedPeerAssessmentProgressScenarios(context),
    () => seedForumPosts(context.projects, context.usersByRole.adminOrStaff, context.usersByRole.students),
    () => seedMeetings(context),
    () => seedNotifications(context),
    // Temporary: seed an unassigned-students project for testing.
    () => seedUnteamedProjectScenario(context),
  ];

  if (SEED_ENABLE_ADMIN_TEAM_ALLOCATION) {
    steps.splice(3, 0, () => seedAdminTeamAllocation(context.enterprise.id));
  }

  if (SEED_COMPLETED_PROJECT_SCENARIO) {
    steps.splice(7, 0, () => seedCompletedProjectScenario(context));
  }

  return steps;
}

// Temporary: seeds a module/project with students not allocated to teams.
async function seedUnteamedProjectScenario(context: SeedContext) {
  return withSeedLogging("seedUnteamedProjectScenario", async () => {
    const enterpriseId = context.enterprise.id;
    const staff = await prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: "staff1@example.com" } },
      select: { id: true },
    });

    if (!staff) {
      return { value: undefined, rows: 0, details: "skipped (staff1 not found)" };
    }

    const template = context.templates[0];
    if (!template) {
      return { value: undefined, rows: 0, details: "skipped (no questionnaire template)" };
    }

    const moduleName = "Unassigned Students Module";
    const moduleCode = "MOD-EXTRA-1";
    const joinCode = planSeedModuleJoinCode(SEED_MODULE_COUNT);

    const existingModule = await prisma.module.findFirst({
      where: { enterpriseId, name: moduleName },
      select: { id: true },
    });

    const module =
      existingModule ??
      (await prisma.module.create({
        data: {
          enterpriseId,
          name: moduleName,
          code: moduleCode,
          joinCode,
        },
        select: { id: true },
      }));

    // Temporary: add staff1 as the module lead for the seeded module.
    const moduleLead = await prisma.moduleLead.createMany({
      data: [{ moduleId: module.id, userId: staff.id }],
      skipDuplicates: true,
    });

    const projectName = "Unassigned Students Project";
    const existingProject = await prisma.project.findFirst({
      where: { moduleId: module.id, name: projectName },
      select: { id: true },
    });

    const project =
      existingProject ??
      (await prisma.project.create({
        data: {
          moduleId: module.id,
          name: projectName,
          informationText:
            "This seeded project is intended to have enrolled students without any team allocations.",
          questionnaireTemplateId: template.id,
        },
        select: { id: true },
      }));

    // Temporary: seed a small selection of students (including student1).
    const student1 = await prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: "student1@example.com" } },
      select: { id: true },
    });

    const fallbackStudents = await prisma.user.findMany({
      where: { enterpriseId, role: "STUDENT" },
      orderBy: { id: "asc" },
      take: 6,
      select: { id: true },
    });

    const selectedStudentIds = new Set<number>();
    if (student1) selectedStudentIds.add(student1.id);
    for (const student of fallbackStudents) {
      if (selectedStudentIds.size >= 4) break;
      selectedStudentIds.add(student.id);
    }

    if (selectedStudentIds.size === 0) {
      return { value: undefined, rows: moduleLead.count + Number(!existingProject), details: "skipped (no students)" };
    }

    // Temporary: enroll selected students in the module.
    const enrollmentCreates = await prisma.userModule.createMany({
      data: Array.from(selectedStudentIds).map((userId) => ({
        enterpriseId,
        userId,
        moduleId: module.id,
      })),
      skipDuplicates: true,
    });

    // Temporary: assign selected students to the project membership list.
    const projectMemberCreates = await prisma.projectStudent.createMany({
      data: Array.from(selectedStudentIds).map((userId) => ({
        projectId: project.id,
        userId,
      })),
      skipDuplicates: true,
    });

    // Temporary: ensure these students are not allocated to any teams.
    const allocationDeletes = await prisma.teamAllocation.deleteMany({
      where: { userId: { in: Array.from(selectedStudentIds) } },
    });

    return {
      value: { moduleId: module.id, projectId: project.id },
      rows: moduleLead.count + enrollmentCreates.count + projectMemberCreates.count + allocationDeletes.count,
      details: `moduleLead=${moduleLead.count}, enrollments=${enrollmentCreates.count}, projectStudents=${projectMemberCreates.count}, teamAllocationsRemoved=${allocationDeletes.count}`,
    };
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
