import argon2 from "argon2";
import {
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

const seedPassword = process.env.SEED_USER_PASSWORD || "password123";

async function main() {
  assertPrismaClientModels();

  const seedPasswordHash = await argon2.hash(seedPassword);
  const enterprises = await getSeedEnterprises();

  for (const enterprise of enterprises) {
    await seedAdminUser(enterprise.id);
    const users = await seedUsers(enterprise.id, seedPasswordHash);
    const modules = await seedModules(enterprise.id);
    const templates = await seedQuestionnaireTemplates();
    const projects = await seedProjects(modules, templates);
    const teams = await seedTeams(enterprise.id, projects);

    await seedModuleLeads(users, modules);
    await seedStudentEnrollments(enterprise.id, users, modules);
    await seedTeamAllocations(users, teams);
    await seedAdminTeamAllocation(enterprise.id); // TODO: only for testing Trello integration, remove later
    await seedGithubE2EUsers(enterprise.id, projects, teams);
    await seedProjectDeadlines(projects);
    await seedPeerAssessments(projects, teams, templates);
    await seedFeatureFlags(enterprise.id);
  }

  console.log(`Seed users ready across ${enterprises.length} enterprise(s). Default password: ${seedPassword}`);
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
