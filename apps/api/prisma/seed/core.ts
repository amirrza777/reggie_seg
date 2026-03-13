import argon2 from "argon2";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";

export function assertPrismaClientModels() {
  const client = prisma as unknown as Record<string, unknown>;
  if (!("project" in client)) {
    throw new Error(
      "Prisma Client is out of date (missing `project` delegate). Run `npx prisma generate` and retry."
    );
  }
}

export async function getDefaultEnterpriseId(): Promise<string> {
  return withSeedLogging("getDefaultEnterpriseId", async () => {
    const enterprise = await prisma.enterprise.findUnique({
      where: { code: "DEFAULT" },
      select: { id: true },
    });
    if (enterprise) {
      return {
        value: enterprise.id,
        rows: 0,
        details: "enterprise already exists",
      };
    }

    const created = await prisma.enterprise.create({
      data: { code: "DEFAULT", name: "Default Enterprise" },
      select: { id: true },
    });

    return {
      value: created.id,
      rows: 1,
      details: `enterpriseId=${created.id}`,
    };
  });
}

export async function seedAdminUser(enterpriseId: string) {
  return withSeedLogging("seedAdminUser", async () => {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!email || !password) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (ADMIN_BOOTSTRAP_EMAIL/PASSWORD not set)",
      };
    }

    const existing = await prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email } },
    });
    if (existing) {
      return {
        value: undefined,
        rows: 0,
        details: `skipped (admin already exists: ${email})`,
      };
    }

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

    return {
      value: undefined,
      rows: 1,
      details: `created admin=${email}`,
    };
  });
}
