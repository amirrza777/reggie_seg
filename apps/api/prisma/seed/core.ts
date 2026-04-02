import argon2 from "argon2";
import { ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD } from "./config";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedEnterprise } from "./types";
import { SEED_ENTERPRISE_COUNT } from "./volumes";

export function assertPrismaClientModels() {
  const client = prisma as unknown as Record<string, unknown>;
  if (!("project" in client)) {
    throw new Error(
      "Prisma Client is out of date (missing `project` delegate). Run `npx prisma generate` and retry."
    );
  }
}

export async function getSeedEnterprises(): Promise<SeedEnterprise[]> {
  return withSeedLogging("getSeedEnterprises", async () => {
    const enterprises: SeedEnterprise[] = [];
    let createdCount = 0;

    for (let index = 0; index < SEED_ENTERPRISE_COUNT; index += 1) {
      const config = buildSeedEnterprise(index);
      const enterprise = await prisma.enterprise.findUnique({
        where: { code: config.code },
        select: { id: true },
      });

      if (enterprise) {
        enterprises.push({ ...config, id: enterprise.id });
        continue;
      }

      const created = await prisma.enterprise.create({
        data: { code: config.code, name: config.name },
        select: { id: true },
      });

      enterprises.push({ ...config, id: created.id });
      createdCount += 1;
    }

    return {
      value: enterprises,
      rows: createdCount,
      details: `seed enterprises=${enterprises.length}`,
    };
  });
}

export async function seedAdminUser(enterpriseId: string) {
  return withSeedLogging("seedAdminUser", async () => {
    const credentials = getAdminBootstrapCredentials();
    if (!credentials) return missingAdminCredentialsResult();

    const existing = await findEnterpriseAdminByEmail(enterpriseId, credentials.email);
    if (existing) return existingAdminResult(credentials.email);

    await createAdminUser(enterpriseId, credentials.email, credentials.password);
    return createdAdminResult(credentials.email);
  });
}

function buildSeedEnterprise(index: number) {
  if (index === 0) {
    return {
      code: "DEFAULT",
      name: "Default Enterprise",
    };
  }

  return {
    code: `ENT${index + 1}`,
    name: `Seed Enterprise ${index + 1}`,
  };
}

function getAdminBootstrapCredentials() {
  const email = ADMIN_BOOTSTRAP_EMAIL;
  const password = ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

function missingAdminCredentialsResult() {
  return {
    value: undefined,
    rows: 0,
    details: "skipped (ADMIN_BOOTSTRAP_EMAIL/PASSWORD not set)",
  };
}

function existingAdminResult(email: string) {
  return {
    value: undefined,
    rows: 0,
    details: `skipped (admin already exists: ${email})`,
  };
}

function createdAdminResult(email: string) {
  return {
    value: undefined,
    rows: 1,
    details: `created admin=${email}`,
  };
}

function findEnterpriseAdminByEmail(enterpriseId: string, email: string) {
  return prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email } },
  });
}

async function createAdminUser(enterpriseId: string, email: string, password: string) {
  const passwordHash = await argon2.hash(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      enterpriseId,
    },
  });
}
