import type { Prisma } from "@prisma/client";
import {
  createModuleJoinCodeCandidate,
  MODULE_JOIN_CODE_MAX_ATTEMPTS,
  normalizeModuleJoinCode,
} from "./code.js";
import {
  findJoinActor,
  findJoinableModuleByCode,
  getAuthorizedModuleForJoinCodeMutation,
  getAuthorizedModuleJoinCode,
  insertModuleEnrollment,
  updateModuleJoinCode,
} from "./repo.js";

export type ModuleJoinServiceErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_CODE"
  | "MODULE_NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT";

type ModuleJoinServiceError = {
  status: number;
  code: ModuleJoinServiceErrorCode;
  error: string;
};

type ServiceResult<T> = { ok: true; value: T } | ({ ok: false } & ModuleJoinServiceError);

export type JoinModuleByCodeResponse = {
  moduleId: number;
  moduleName: string;
  result: "joined" | "already_joined";
};

export type ModuleJoinCodeResponse = {
  moduleId: number;
  joinCode: string;
};

export type RotateModuleJoinCodeResponse = {
  moduleId: number;
  joinCode: string;
};

function fail(status: number, code: ModuleJoinServiceErrorCode, error: string): ServiceResult<never> {
  return { ok: false, status, code, error };
}

function emitModuleJoinAuditEvent(
  event:
    | "module_join_success"
    | "module_join_already_joined"
    | "module_join_invalid_code"
    | "module_join_code_viewed"
    | "module_join_code_rotated",
  payload: Record<string, unknown>,
) {
  console.info(
    "[moduleJoin:audit]",
    JSON.stringify({
      event,
      occurredAt: new Date().toISOString(),
      ...payload,
    }),
  );
}

/**
 * Error mapping table:
 * UNAUTHORIZED -> 401
 * FORBIDDEN -> 403
 * INVALID_CODE -> 400
 * MODULE_NOT_FOUND -> 404
 * CONFLICT -> 409
 */
export async function joinModuleByCode(actorUserId: number, rawCode: string) {
  const actorResult = await resolveStudentJoinActor(actorUserId);
  if (!actorResult.ok) return actorResult;

  const moduleResult = await resolveJoinTargetModule(actorResult.value, rawCode);
  if (!moduleResult.ok) return moduleResult;

  const enrollmentResult = await joinStudentToModule(actorResult.value, moduleResult.value.module);
  if (!enrollmentResult.ok) return enrollmentResult;

  return enrollmentResult;
}

export async function getModuleJoinCode(viewerUser: { enterpriseId: string; role: string; id: number }, moduleId: number) {
  const module = await getAuthorizedModuleJoinCode({
    enterpriseId: viewerUser.enterpriseId,
    moduleId,
    userId: viewerUser.id,
    role: viewerUser.role,
  });
  if (!module) return fail(404, "MODULE_NOT_FOUND", "Module not found");

  emitModuleJoinAuditEvent("module_join_code_viewed", {
    actorUserId: viewerUser.id,
    enterpriseId: viewerUser.enterpriseId,
    moduleId: module.id,
  });

  return {
    ok: true as const,
    value: {
      moduleId: module.id,
      joinCode: module.joinCode,
    },
  };
}

export async function rotateModuleJoinCode(viewerUser: { enterpriseId: string; role: string; id: number }, moduleId: number) {
  const module = await getAuthorizedModuleForJoinCodeMutation({
    enterpriseId: viewerUser.enterpriseId,
    moduleId,
    userId: viewerUser.id,
    role: viewerUser.role,
  });
  if (!module) return fail(404, "MODULE_NOT_FOUND", "Module not found");

  const updated = await withGeneratedModuleJoinCode(viewerUser.enterpriseId, async (candidate) => {
    return updateModuleJoinCode(module.id, viewerUser.enterpriseId, candidate);
  });
  if (!updated) return fail(404, "MODULE_NOT_FOUND", "Module not found");

  emitModuleJoinAuditEvent("module_join_code_rotated", {
    actorUserId: viewerUser.id,
    enterpriseId: viewerUser.enterpriseId,
    moduleId: updated.id,
  });

  return {
    ok: true as const,
    value: {
      moduleId: updated.id,
      joinCode: updated.joinCode,
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

async function resolveStudentJoinActor(actorUserId: number) {
  const actor = await findJoinActor(actorUserId);
  if (!actor) return fail(401, "UNAUTHORIZED", "Unauthorized");
  if (actor.role !== "STUDENT") return fail(403, "FORBIDDEN", "Forbidden");
  return { ok: true as const, value: actor };
}

async function resolveJoinTargetModule(
  actor: Awaited<ReturnType<typeof findJoinActor>> & { role: "STUDENT" },
  rawCode: string,
) {
  const joinCode = normalizeModuleJoinCode(rawCode);
  if (!joinCode) return failWithInvalidJoinCode(actor, { rawCode: rawCode.slice(0, 16) });

  const module = await findJoinableModuleByCode(actor.enterpriseId, joinCode);
  if (!module) return failWithInvalidJoinCode(actor, { joinCode });
  return { ok: true as const, value: { module, joinCode } };
}

function failWithInvalidJoinCode(
  actor: { id: number; enterpriseId: string },
  payload: { rawCode?: string; joinCode?: string },
) {
  emitModuleJoinAuditEvent("module_join_invalid_code", {
    actorUserId: actor.id,
    enterpriseId: actor.enterpriseId,
    ...payload,
  });
  return fail(400, "INVALID_CODE", "Invalid or unavailable module code");
}

async function joinStudentToModule(
  actor: { id: number; enterpriseId: string },
  module: { id: number; name: string },
) {
  const inserted = await insertModuleEnrollment(actor.enterpriseId, actor.id, module.id);
  emitJoinEnrollmentAuditEvent(actor, module.id, inserted);
  return {
    ok: true as const,
    value: {
      moduleId: module.id,
      moduleName: module.name,
      result: inserted ? ("joined" as const) : ("already_joined" as const),
    },
  };
}

function emitJoinEnrollmentAuditEvent(
  actor: { id: number; enterpriseId: string },
  moduleId: number,
  inserted: boolean,
) {
  emitModuleJoinAuditEvent(inserted ? "module_join_success" : "module_join_already_joined", {
    actorUserId: actor.id,
    enterpriseId: actor.enterpriseId,
    moduleId,
  });
}
