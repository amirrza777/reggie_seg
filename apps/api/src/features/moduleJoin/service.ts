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
  type ModuleJoinActor,
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

const MODULE_JOIN_AUDIT_EVENT = {
  JOIN_SUCCESS: "module_join_success",
  JOIN_ALREADY_JOINED: "module_join_already_joined",
  JOIN_INVALID_CODE: "module_join_invalid_code",
  CODE_VIEWED: "module_join_code_viewed",
  CODE_ROTATED: "module_join_code_rotated",
} as const;

type ModuleJoinAuditEvent = (typeof MODULE_JOIN_AUDIT_EVENT)[keyof typeof MODULE_JOIN_AUDIT_EVENT];

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
  event: ModuleJoinAuditEvent,
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

  return joinStudentToModule(actorResult.value, moduleResult.value.module);
}

export async function getModuleJoinCode(actorUserId: number, moduleId: number) {
  const actorResult = await resolveJoinCodeManagerActor(actorUserId);
  if (!actorResult.ok) return actorResult;
  const actor = actorResult.value;

  const module = await getAuthorizedModuleJoinCode({
    enterpriseId: actor.enterpriseId,
    moduleId,
    userId: actor.id,
    role: actor.role,
  });
  if (!module) return fail(404, "MODULE_NOT_FOUND", "Module not found");

  emitModuleJoinAuditEvent(MODULE_JOIN_AUDIT_EVENT.CODE_VIEWED, {
    actorUserId: actor.id,
    enterpriseId: actor.enterpriseId,
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

export async function rotateModuleJoinCode(actorUserId: number, moduleId: number) {
  const actorResult = await resolveJoinCodeManagerActor(actorUserId);
  if (!actorResult.ok) return actorResult;
  const actor = actorResult.value;

  const module = await getAuthorizedModuleForJoinCodeMutation({
    enterpriseId: actor.enterpriseId,
    moduleId,
    userId: actor.id,
    role: actor.role,
  });
  if (!module) return fail(404, "MODULE_NOT_FOUND", "Module not found");

  const updated = await withGeneratedModuleJoinCode(actor.enterpriseId, async (candidate) => {
    return updateModuleJoinCode(module.id, actor.enterpriseId, candidate);
  });
  if (!updated) return fail(404, "MODULE_NOT_FOUND", "Module not found");

  emitModuleJoinAuditEvent(MODULE_JOIN_AUDIT_EVENT.CODE_ROTATED, {
    actorUserId: actor.id,
    enterpriseId: actor.enterpriseId,
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
  const actorResult = await requireJoinActor(actorUserId);
  if (!actorResult.ok) return actorResult;
  const actor = actorResult.value;
  if (actor.role === "STAFF") return fail(403, "FORBIDDEN", "Forbidden");
  return { ok: true as const, value: actor };
}

async function resolveJoinCodeManagerActor(actorUserId: number) {
  const actorResult = await requireJoinActor(actorUserId);
  if (!actorResult.ok) return actorResult;
  const actor = actorResult.value;
  if (actor.role === "STUDENT") return fail(403, "FORBIDDEN", "Forbidden");
  return { ok: true as const, value: actor };
}

async function requireJoinActor(actorUserId: number): Promise<ServiceResult<ModuleJoinActor>> {
  const actor = await findJoinActor(actorUserId);
  if (!actor) return fail(401, "UNAUTHORIZED", "Unauthorized");
  return { ok: true as const, value: actor };
}

async function resolveJoinTargetModule(
  actor: { id: number; enterpriseId: string },
  rawCode: string,
) {
  const joinCode = normalizeModuleJoinCode(rawCode);
  if (!joinCode) return failWithInvalidJoinCode(actor, "invalid_format");

  const module = await findJoinableModuleByCode(actor.enterpriseId, joinCode);
  if (!module) return failWithInvalidJoinCode(actor, "not_found");
  return { ok: true as const, value: { module, joinCode } };
}

function failWithInvalidJoinCode(
  actor: { id: number; enterpriseId: string },
  reason: "invalid_format" | "not_found",
) {
  emitModuleJoinAuditEvent(MODULE_JOIN_AUDIT_EVENT.JOIN_INVALID_CODE, {
    actorUserId: actor.id,
    enterpriseId: actor.enterpriseId,
    reason,
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
  emitModuleJoinAuditEvent(inserted ? MODULE_JOIN_AUDIT_EVENT.JOIN_SUCCESS : MODULE_JOIN_AUDIT_EVENT.JOIN_ALREADY_JOINED, {
    actorUserId: actor.id,
    enterpriseId: actor.enterpriseId,
    moduleId,
  });
}
