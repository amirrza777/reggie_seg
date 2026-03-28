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
import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines } from "./outcomes";
import { seedPeerAssessmentProgressScenarios } from "./peer-assessment-scenarios";
import { seedMeetings } from "./meetings";
import { prisma } from "./prismaClient";
import type { SeedContext, SeedEnterprise } from "./types";

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
  ];

  if (SEED_ENABLE_ADMIN_TEAM_ALLOCATION) {
    steps.splice(3, 0, () => seedAdminTeamAllocation(context.enterprise.id));
  }

  if (SEED_COMPLETED_PROJECT_SCENARIO) {
    steps.splice(7, 0, () => seedCompletedProjectScenario(context));
  }

  return steps;
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
