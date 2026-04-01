import argon2 from "argon2";
import { ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD } from "./config";
import { prisma } from "./prismaClient";
import type { SeedEnterprise } from "./types";
import { SEED_ENTERPRISE_COUNT } from "./volumes";

export function assertPrismaClientModels() {
  const requiredDelegates = [
    "enterprise",
    "user",
    "module",
    "project",
    "team",
    "questionnaireTemplate",
    "teamAllocation",
    "featureFlag",
  ] as const;

  for (const delegate of requiredDelegates) {
    if (!(delegate in prisma)) {
      throw new Error(`Prisma client is missing delegate: ${delegate}`);
    }
  }
}

export async function getSeedEnterprises(): Promise<SeedEnterprise[]> {
  const total = Math.max(1, SEED_ENTERPRISE_COUNT);
  const enterprises: SeedEnterprise[] = [];

  for (let index = 0; index < total; index += 1) {
    const { code, name } = buildEnterpriseSeedDescriptor(index);
    const existing = await prisma.enterprise.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      enterprises.push({ id: existing.id, code, name });
      continue;
    }

    const created = await prisma.enterprise.create({
      data: { code, name },
      select: { id: true, code: true, name: true },
    });

    enterprises.push(created);
  }

  return enterprises;
}

export async function seedAdminUser(enterpriseId: string) {
  if (!ADMIN_BOOTSTRAP_EMAIL || !ADMIN_BOOTSTRAP_PASSWORD) return;

  const existing = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId,
        email: ADMIN_BOOTSTRAP_EMAIL,
      },
    },
    select: { id: true },
  });
  if (existing) return;

  const passwordHash = await argon2.hash(ADMIN_BOOTSTRAP_PASSWORD);
  await prisma.user.create({
    data: {
      email: ADMIN_BOOTSTRAP_EMAIL,
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      enterpriseId,
    },
  });
}

function buildEnterpriseSeedDescriptor(index: number) {
  if (index === 0) {
    return { code: "DEFAULT", name: "Default Enterprise" };
  }

  const sequence = index + 1;
  return {
    code: `ENT${sequence}`,
    name: `Enterprise ${sequence}`,
  };
}
