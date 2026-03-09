import argon2 from "argon2";
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
  const enterprise = await prisma.enterprise.findUnique({
    where: { code: "DEFAULT" },
    select: { id: true },
  });

  if (enterprise) return enterprise.id;

  const created = await prisma.enterprise.create({
    data: { code: "DEFAULT", name: "Default Enterprise" },
    select: { id: true },
  });

  return created.id;
}

export async function seedAdminUser(enterpriseId: string) {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email } },
  });
  if (existing) return;

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
