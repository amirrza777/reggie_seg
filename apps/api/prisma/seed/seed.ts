import argon2 from "argon2";
import {
  buildUsersByRole,
  seedAdminTeamAllocation,
  seedGithubE2EUsers,
  seedModuleLeads,
  seedStudentEnrollments,
  seedTeamAllocations,
} from "./allocation";
import { seedModules, seedProjects, seedQuestionnaireTemplates, seedTeams, seedUsers } from "./catalog";
import { assertPrismaClientModels, getSeedEnterprises, seedAdminUser } from "./core";
import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines } from "./outcomes";
import { prisma } from "./prismaClient";
import type { SeedContext, SeedEnterprise } from "./types";

const seedPassword = process.env.SEED_USER_PASSWORD || "password123";

async function main() {
  assertPrismaClientModels();

  const seedPasswordHash = await argon2.hash(seedPassword);
  const enterprises = await getSeedEnterprises();

  for (const enterprise of enterprises) {
    const context = await buildSeedContext(enterprise, seedPasswordHash);
    await runSeedSteps(context);
  }

  console.log(`Seed users ready across ${enterprises.length} enterprise(s). Default password: ${seedPassword}`);
}

async function buildSeedContext(enterprise: SeedEnterprise, passwordHash: string): Promise<SeedContext> {
  await seedAdminUser(enterprise.id);
  const users = await seedUsers(enterprise.id, passwordHash);
  const modules = await seedModules(enterprise.id);
  const templates = await seedQuestionnaireTemplates();
  const projects = await seedProjects(modules, templates);
  const teams = await seedTeams(enterprise.id, projects);

  return {
    enterprise,
    passwordHash,
    users,
    usersByRole: buildUsersByRole(users),
    modules,
    templates,
    projects,
    teams,
  };
}

async function runSeedSteps(context: SeedContext) {
  await seedModuleLeads(context.usersByRole.adminOrStaff, context.modules);
  await seedStudentEnrollments(context.enterprise.id, context.usersByRole.students, context.modules);
  await seedTeamAllocations(context.usersByRole.students, context.teams);
  await seedAdminTeamAllocation(context.enterprise.id); // TODO: only for testing Trello integration, remove later
  await seedGithubE2EUsers(context.enterprise.id, context.projects, context.teams);
  await seedProjectDeadlines(context.projects);
  await seedPeerAssessments(context.projects, context.teams, context.templates);
  await seedFeatureFlags(context.enterprise.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    throw err;
  });
