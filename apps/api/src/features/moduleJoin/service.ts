import type { Prisma } from "@prisma/client";
import { canManageModuleAccess } from "../enterpriseAdmin/service.core.js";
import { createModuleJoinCodeCandidate, MODULE_JOIN_CODE_MAX_ATTEMPTS, normalizeModuleJoinCode } from "./code.js";
import { findJoinActor, findJoinableModuleByCode, getManagedModuleJoinCode, insertModuleEnrollment } from "./repo.js";

export type JoinModuleByCodeResponse = {
  moduleId: number;
  moduleName: string;
  result: "joined" | "already_joined";
};

export async function joinModuleByCode(actorUserId: number, rawCode: string) {
  const actor = await findJoinActor(actorUserId);
  if (!actor) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  if (actor.role !== "STUDENT") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const normalizedCode = normalizeModuleJoinCode(rawCode);
  if (!normalizedCode) {
    return { ok: false as const, status: 400, error: "Invalid or unavailable module code" };
  }

  const module = await findJoinableModuleByCode(actor.enterpriseId, normalizedCode);
  if (!module) {
    return { ok: false as const, status: 400, error: "Invalid or unavailable module code" };
  }

  const inserted = await insertModuleEnrollment(actor.enterpriseId, actor.id, module.id);
  return {
    ok: true as const,
    value: {
      moduleId: module.id,
      moduleName: module.name,
      result: inserted ? "joined" : "already_joined",
    },
  };
}

export async function getModuleJoinCode(viewerUser: { enterpriseId: string; role: string; id: number }, moduleId: number) {
  const module = await getManagedModuleJoinCode(viewerUser.enterpriseId, moduleId);
  if (!module) return { ok: false as const, status: 404, error: "Module not found" };

  const canManage = await canManageModuleAccess(viewerUser, moduleId);
  if (!canManage) return { ok: false as const, status: 403, error: "Forbidden" };

  return {
    ok: true as const,
    value: {
      moduleId: module.id,
      joinCode: module.joinCode,
    },
  };
}

export async function withGeneratedModuleJoinCode<T>(
  enterpriseId: string,
  write: (joinCode: string) => Promise<T>,
  maxAttempts = MODULE_JOIN_CODE_MAX_ATTEMPTS,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await write(createModuleJoinCodeCandidate());
    } catch (error) {
      if (isModuleJoinCodeUniqueConstraintError(error) && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to generate module join code for enterprise ${enterpriseId}`);
}

function isModuleJoinCodeUniqueConstraintError(error: unknown) {
  const prismaError = error as Prisma.PrismaClientKnownRequestError | null;
  if (prismaError?.code !== "P2002") {
    return false;
  }

  const target = prismaError.meta?.target;
  return Array.isArray(target) && target.includes("enterpriseId") && target.includes("joinCode");
}
