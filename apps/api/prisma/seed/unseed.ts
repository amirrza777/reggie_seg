import { PrismaClient } from "@prisma/client";
import { SEED_DATABASE_PROVIDER } from "./config";
import { assertSeedCleanupCoverage, getSeedCleanupManifest } from "./schema";

const prisma = new PrismaClient();

async function main() {
  assertSeedCleanupCoverage(prisma as unknown as Record<string, unknown>);
  const cleanupManifest = getSeedCleanupManifest();
  const cleanupStrategy = getCleanupStrategy(SEED_DATABASE_PROVIDER);
  if (cleanupStrategy.beforeAll) {
    await prisma.$executeRawUnsafe(cleanupStrategy.beforeAll);
  }

  try {
    for (const entry of cleanupManifest) {
      try {
        await prisma.$executeRawUnsafe(cleanupStrategy.truncate(entry.tableName));
      } catch (error: any) {
        // Ignore missing tables to support older migration states.
        if (isMissingTableError(error, cleanupStrategy.provider)) continue;
        throw error;
      }
    }
  } finally {
    if (cleanupStrategy.afterAll) {
      await prisma.$executeRawUnsafe(cleanupStrategy.afterAll);
    }
  }
}

type CleanupStrategy = {
  provider: "mysql" | "postgresql";
  beforeAll?: string;
  afterAll?: string;
  truncate: (table: string) => string;
};

function getCleanupStrategy(provider: string): CleanupStrategy {
  if (provider === "postgresql" || provider === "postgres") {
    return {
      provider: "postgresql",
      truncate: (table) => `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
    };
  }

  return {
    provider: "mysql",
    beforeAll: "SET FOREIGN_KEY_CHECKS = 0;",
    afterAll: "SET FOREIGN_KEY_CHECKS = 1;",
    truncate: (table) => `TRUNCATE TABLE \`${table}\`;`,
  };
}

function isMissingTableError(error: unknown, provider: CleanupStrategy["provider"]) {
  const code = (error as { meta?: { code?: string }; code?: string })?.meta?.code ?? (error as { code?: string })?.code;
  return provider === "mysql" ? code === "1146" : code === "42P01";
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
