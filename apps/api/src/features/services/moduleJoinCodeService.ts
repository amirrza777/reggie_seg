import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

const MODULE_JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const MODULE_JOIN_CODE_LENGTH = 8;
const MODULE_JOIN_CODE_MAX_ATTEMPTS = 20;

type ModuleJoinCodeClient = Pick<Prisma.TransactionClient, "module">;

export function normalizeModuleJoinCode(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== MODULE_JOIN_CODE_LENGTH) {
    return null;
  }
  return normalized;
}

export async function generateModuleJoinCode(client: ModuleJoinCodeClient, enterpriseId: string): Promise<string> {
  for (let attempt = 0; attempt < MODULE_JOIN_CODE_MAX_ATTEMPTS; attempt += 1) {
    const candidate = createModuleJoinCodeCandidate();
    const existing = await client.module.findFirst({
      where: {
        enterpriseId,
        joinCode: candidate,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique module join code");
}

function createModuleJoinCodeCandidate() {
  const random = randomBytes(MODULE_JOIN_CODE_LENGTH);
  let code = "";
  for (const value of random) {
    code += MODULE_JOIN_CODE_ALPHABET[value % MODULE_JOIN_CODE_ALPHABET.length];
  }
  return code;
}
