/* eslint-disable max-lines-per-function, max-statements, complexity */
import { recordAuditLog } from "../audit/service.js";
import {
  buildAdminUserSearchOrderBy,
  buildAdminUserSearchWhere,
  matchesAdminUserSearchCandidate,
  type AdminUserSearchFilters,
} from "./userSearch.js";
import * as repo from "./repo.js";
import type { UserRole } from "./types.js";
import {
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES,
  fuzzyFilterAndPaginate,
  shouldUseFuzzyFallback,
} from "../../shared/fuzzyFallback.js";
import {
  canManageTargetUser,
  isSuperAdminActor,
  isSuperAdminEmail,
  resolveManagedScopeEnterpriseId,
  toAdminUserPayload,
  toAdminUserSearchResponse,
} from "./service.operations.shared.js";

export async function resolveAdminUser(payload: { sub?: number; admin?: boolean }) {
  if (!payload?.sub || !payload.admin) {
    return null;
  }
  const user = await repo.findAdminUserById(payload.sub);
  if (!user || user.role !== "ADMIN" || user.active === false) {
    return null;
  }
  return user;
}

export function isRole(value: unknown): value is UserRole {
  return value === "STUDENT" || value === "STAFF" || value === "ADMIN" || value === "ENTERPRISE_ADMIN";
}

export async function getSummary(enterpriseId: string) {
  const [users, modules, teams, meetings] = await Promise.all([
    repo.countEnterpriseUsers(enterpriseId),
    repo.countEnterpriseModules(enterpriseId),
    repo.countEnterpriseTeams(enterpriseId),
    repo.countEnterpriseMeetings(enterpriseId),
  ]);
  return { users, modules, teams, meetings };
}

export async function listUsers(actor?: { enterpriseId?: string; email?: string }) {
  const scopeEnterpriseId = resolveManagedScopeEnterpriseId(actor);
  const records = scopeEnterpriseId
    ? await repo.listUsersByEnterprise(scopeEnterpriseId)
    : await repo.listUsers();
  return records.map(toAdminUserPayload);
}

async function searchUsersWithScope(filters: AdminUserSearchFilters, enterpriseId: string | null) {
  const where = buildAdminUserSearchWhere({
    enterpriseId,
    query: filters.query,
    role: filters.role,
    active: filters.active,
  });
  const orderBy = buildAdminUserSearchOrderBy(filters);
  const [total, records] = await Promise.all([
    repo.countUsersByWhere(where),
    repo.listUsersByWhere(where, filters.page, filters.pageSize, orderBy),
  ]);
  const strictResponse = toAdminUserSearchResponse(records, filters, total);
  if (!shouldUseFuzzyFallback(total, filters.query)) {
    return strictResponse;
  }

  const fuzzyBaseWhere = buildAdminUserSearchWhere({
    enterpriseId,
    query: null,
    role: filters.role,
    active: filters.active,
  });
  const candidateTotal = await repo.countUsersByWhere(fuzzyBaseWhere);
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) {
    return strictResponse;
  }

  const candidates = await repo.listUsersByWhere(fuzzyBaseWhere, 1, candidateTotal);
  const fuzzyPage = fuzzyFilterAndPaginate(candidates, {
    query: filters.query,
    pagination: filters,
    matches: matchesAdminUserSearchCandidate,
  });
  return toAdminUserSearchResponse(fuzzyPage.items, filters, fuzzyPage.total);
}

export async function searchUsers(filters: AdminUserSearchFilters, actor?: { enterpriseId?: string; email?: string }) {
  return searchUsersWithScope(filters, resolveManagedScopeEnterpriseId(actor));
}

export async function updateOwnEnterpriseUserRole(id: number, role: UserRole, actor?: { id?: number; enterpriseId?: string; email?: string }) {
  if (role === "ENTERPRISE_ADMIN") {
    return { ok: false as const, status: 400, error: "Role not assignable" };
  }
  if (role === "ADMIN" && !isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Role not assignable" };
  }
  const user = await repo.findUserById(id);
  if (!user) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (!canManageTargetUser(actor, user.enterpriseId)) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (user.role === "ADMIN" && !isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
  }
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot change role for super admin" };
  }
  const updated = await repo.updateUser(id, { role });
  if (actor?.id) {
    await recordAuditLog({ userId: actor.id, enterpriseId: user.enterpriseId, action: "USER_ROLE_CHANGED" });
  }
  return { ok: true as const, value: toAdminUserPayload(updated) };
}

export async function updateOwnEnterpriseUser(
  id: number,
  data: { active?: boolean; role?: UserRole },
  actor?: { id?: number; enterpriseId?: string; email?: string },
) {
  const user = await repo.findUserById(id);
  if (!user) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (!canManageTargetUser(actor, user.enterpriseId)) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (user.role === "ADMIN" && !isSuperAdminActor(actor)) {
    return { ok: false as const, status: 403, error: "Cannot modify platform admin accounts" };
  }
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  const updateData: { active?: boolean; role?: UserRole } = {};
  if (typeof data.active === "boolean") {
    updateData.active = data.active;
  }
  if (data.role && data.role !== "ENTERPRISE_ADMIN") {
    if (data.role === "ADMIN" && !isSuperAdminActor(actor)) {
      return { ok: false as const, status: 403, error: "Role not assignable" };
    }
    updateData.role = data.role;
  }
  const updated = await repo.updateUser(id, updateData);
  if (updateData.active === false) {
    await repo.revokeActiveRefreshTokens(id);
  }
  if (actor?.id) {
    await recordAuditLog({ userId: actor.id, enterpriseId: user.enterpriseId, action: "USER_UPDATED" });
  }
  return { ok: true as const, value: toAdminUserPayload(updated) };
}

export async function listEnterpriseUsers(enterpriseId: string) {
  const exists = await repo.findEnterpriseById(enterpriseId);
  if (!exists) {
    return { ok: false as const, status: 404, error: "Enterprise not found" };
  }
  const users = await repo.listUsersByEnterprise(enterpriseId);
  return { ok: true as const, value: users.map(toAdminUserPayload) };
}

export async function searchEnterpriseUsers(enterpriseId: string, filters: AdminUserSearchFilters) {
  const exists = await repo.findEnterpriseById(enterpriseId);
  if (!exists) {
    return { ok: false as const, status: 404, error: "Enterprise not found" };
  }
  return { ok: true as const, value: await searchUsersWithScope(filters, enterpriseId) };
}

export async function updateEnterpriseUser(
  enterpriseId: string,
  id: number,
  data: { active?: boolean; role?: UserRole },
  actorId?: number,
) {
  const user = await repo.findUserInEnterprise(id, enterpriseId);
  if (!user) {
    return { ok: false as const, status: 404, error: "User not found" };
  }
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  const updateData: { active?: boolean; role?: UserRole } = {};
  if (typeof data.active === "boolean") {
    updateData.active = data.active;
  }
  if (data.role) {
    updateData.role = data.role;
  }
  const updated = await repo.updateUser(id, updateData);
  if (updateData.active === false) {
    await repo.revokeActiveRefreshTokens(id);
  }
  if (actorId) {
    const action = updateData.role && updateData.role !== user.role ? "USER_ROLE_CHANGED" : "USER_UPDATED";
    await recordAuditLog({ userId: actorId, enterpriseId, action });
  }
  return { ok: true as const, value: toAdminUserPayload(updated) };
}
