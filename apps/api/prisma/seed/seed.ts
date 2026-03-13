import argon2 from "argon2";
import {
  seedAdminTeamAllocation,
  seedGithubE2EUsers,
  seedModuleLeads,
  seedStudentEnrollments,
  seedTeamAllocations,
} from "./allocation";
import { seedModules, seedProjects, seedQuestionnaireTemplates, seedTeams, seedUsers } from "./catalog";
import { assertPrismaClientModels, getDefaultEnterpriseId, seedAdminUser } from "./core";
import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines } from "./outcomes";
import { prisma } from "./prismaClient";

const seedPassword = process.env.SEED_USER_PASSWORD || "password123";

async function main() {
  assertPrismaClientModels();

  const seedPasswordHash = await argon2.hash(seedPassword);
  const enterpriseId = await getDefaultEnterpriseId();

  await seedAdminUser(enterpriseId);
  const users = await seedUsers(enterpriseId, seedPasswordHash);
  const modules = await seedModules(enterpriseId);
  const templates = await seedQuestionnaireTemplates();
  const projects = await seedProjects(modules, templates);
  const teams = await seedTeams(enterpriseId, projects);

  await seedModuleLeads(users, modules);
  await seedStudentEnrollments(enterpriseId, users, modules);
  await seedTeamAllocations(users, teams);
  await seedAdminTeamAllocation(enterpriseId); // TODO: only for testing Trello integration, remove later
  await seedGithubE2EUsers(enterpriseId, projects, teams);
  await seedProjectDeadlines(projects);
  await seedPeerAssessments(projects, teams, templates);
  await seedFeatureFlags(enterpriseId);

  console.log(`Seed users ready. Default password: ${seedPassword}`);
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
