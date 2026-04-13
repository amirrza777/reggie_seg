/* eslint-disable max-lines-per-function */
import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import type { UserRole } from "../types.js";

export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@kcl.ac.uk").toLowerCase();
export const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();
export const ENTERPRISE_CODE_REGEX = /^[A-Z0-9]{3,16}$/;
export const ENTERPRISE_INVITE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ENTERPRISE_CREATE_MAX_CODE_GENERATION_ATTEMPTS = 5;
export const ENTERPRISE_ADMIN_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

export type AdminActor = { id?: number; enterpriseId?: string; email?: string } | undefined;

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isPrismaUniqueConstraintError(err: unknown): err is { code: string; meta?: { target?: unknown } } {
  return Boolean(err && typeof err === "object" && (err as { code?: unknown }).code === "P2002");
}

export function isEnterpriseCodeUniqueConstraintError(err: unknown): boolean {
  if (!isPrismaUniqueConstraintError(err)) {
    return false;
  }
  const target = err.meta?.target;
  if (!Array.isArray(target)) {
    return true;
  }
  return target.some((item) => typeof item === "string" && item.toLowerCase() === "code");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isSuperAdminEmail(email: string) {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isSuperAdminActor(actor: AdminActor): boolean {
  return Boolean(actor?.email && isSuperAdminEmail(actor.email));
}

export function resolveManagedScopeEnterpriseId(actor: AdminActor): string | null {
  if (!actor) {
    return null;
  }
  if (isSuperAdminActor(actor)) {
    return null;
  }
  return actor.enterpriseId ?? null;
}

export function canManageTargetUser(actor: AdminActor, targetEnterpriseId: string): boolean {
  const scopeEnterpriseId = resolveManagedScopeEnterpriseId(actor);
  if (!scopeEnterpriseId) {
    return true;
  }
  return targetEnterpriseId === scopeEnterpriseId;
}

export function toAdminUserPayload(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  enterpriseId?: string;
  role: string;
  active: boolean;
  enterprise?: {
    id: string;
    name: string;
    code: string;
  } | null;
}) {
  return {
    ...user,
    isStaff: user.role !== "STUDENT",
    role: user.role as UserRole,
  };
}

export function toAdminUserSearchResponse(
  records: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    enterpriseId?: string;
    role: string;
    active: boolean;
    enterprise?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }>,
  filters: { query: string | null; role: UserRole | null; active: boolean | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items: records.map(toAdminUserPayload),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
    role: filters.role,
    active: filters.active,
  };
}

export function toAdminEnterprisePayload(enterprise: {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  users: Array<{ role: UserRole }>;
  _count: { users: number; modules: number; teams: number };
}) {
  const roleCount = enterprise.users.reduce(
    (acc, user) => {
      if (user.role === "ADMIN") {
        acc.admins += 1;
      } else if (user.role === "ENTERPRISE_ADMIN") {
        acc.enterpriseAdmins += 1;
      } else if (user.role === "STAFF") {
        acc.staff += 1;
      } else {
        acc.students += 1;
      }
      return acc;
    },
    { admins: 0, enterpriseAdmins: 0, staff: 0, students: 0 },
  );
  return {
    id: enterprise.id,
    code: enterprise.code,
    name: enterprise.name,
    createdAt: enterprise.createdAt,
    users: enterprise._count.users,
    modules: enterprise._count.modules,
    teams: enterprise._count.teams,
    ...roleCount,
  };
}

export function toAdminEnterpriseSearchResponse(
  items: Array<{
    id: string;
    code: string;
    name: string;
    createdAt: Date;
    users: number;
    admins: number;
    enterpriseAdmins: number;
    staff: number;
    students: number;
    modules: number;
    teams: number;
  }>,
  filters: { query: string | null; page: number; pageSize: number },
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    hasPreviousPage: filters.page > 1,
    hasNextPage: filters.page < totalPages,
    query: filters.query,
  };
}

export function buildVisibleEnterpriseWhere(where: Prisma.EnterpriseWhereInput): Prisma.EnterpriseWhereInput {
  return {
    AND: [
      where,
      { code: { not: REMOVED_USERS_ENTERPRISE_CODE } },
    ],
  };
}
