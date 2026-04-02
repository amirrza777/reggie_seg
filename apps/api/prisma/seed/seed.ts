import argon2 from "argon2";
import { SEED_CONFIG, SEED_PROFILE, SEED_USER_PASSWORD } from "./config";
import { assertPrismaClientModels, getSeedEnterprises } from "./core";
import { seedMarkerUserData } from "./data";
import { seedHelpContent } from "./help";
import { prisma } from "./prismaClient";
import { buildSeedContext, buildSeedStepPlan } from "./plan";

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
  console.log("------------------------------------------------------------------------------------------------------");
  console.log("Assessment accounts seeded for project assessment workflows:");
  for (const account of seedMarkerUserData) {
    console.log(`- ${account.email} (${account.role})`);
  }
  console.log(`These accounts are intended for project assessment/testing flows. Shared password: ${seedPassword}`);
  console.log("Seeded projects also include generated discussion-forum threads from both staff and student accounts.");
  console.log("------------------------------------------------------------------------------------------------------");
  console.log(
    `Seed config: fixtureJoinCodes=${SEED_CONFIG.fixtureJoinCodes}; deterministicFixtures=${SEED_CONFIG.deterministicFixtures}; scenarios=${Array.from(SEED_CONFIG.scenarios).join(", ") || "none"}`,
  );
  console.log("To change seed profiles, rerun with SEED_PROFILE set, e.g. `SEED_PROFILE=demo npm run db:seed`.");
  console.log("Available profiles in code: dev, demo, e2e, trello-e2e.");
}

const seedPassword = SEED_USER_PASSWORD;

async function runSeedSteps(context: Awaited<ReturnType<typeof buildSeedContext>>) {
  for (const step of buildSeedStepPlan(context, SEED_CONFIG)) {
    await step.run();
  }
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
