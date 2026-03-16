import { listAuditLogs } from "../audit/service.js";
import { EnterpriseCodeGeneratorService } from "../services/enterprise/enterpriseCodeGeneratorService.js";
import { buildAdminEnterpriseSearchWhere, type AdminEnterpriseSearchFilters } from "./enterpriseSearch.js";
import { buildAdminUserSearchWhere, type AdminUserSearchFilters } from "./userSearch.js";
import * as repo from "./repo.js";
import type { EnterpriseFlagSeed, UserRole } from "./types.js";

const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";
const ENTERPRISE_CODE_REGEX = /^[A-Z0-9]{3,16}$/;
const enterpriseCodeGenerator = new EnterpriseCodeGeneratorService();
const defaultEnterpriseFeatureFlags: EnterpriseFlagSeed[] = [
  { key: "peer_feedback", label: "Peer feedback", enabled: true },
  { key: "modules", label: "Modules", enabled: true },
  { key: "repos", label: "Repositories", enabled: true },
];

export async function resolveAdminUser(payload: { sub?: number; admin?: boolean }) {
  if (!payload?.sub || !payload.admin) return null;
  const user = await repo.findAdminUserById(payload.sub);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function isSuperAdminEmail(email: string) {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL;
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

export async function listUsers(enterpriseId: string) {
  const records = await repo.listUsersByEnterprise(enterpriseId);
  return records.map(toAdminUserPayload);
}

export async function searchUsers(enterpriseId: string, filters: AdminUserSearchFilters) {
  const where = buildAdminUserSearchWhere(enterpriseId, filters);
  const [total, records] = await Promise.all([
    repo.countUsersByWhere(where),
    repo.listUsersByWhere(where, filters.page, filters.pageSize),
  ]);
  return toAdminUserSearchResponse(records, filters, total);
}

export async function updateOwnEnterpriseUserRole(enterpriseId: string, id: number, role: UserRole) {
  if (role === "ENTERPRISE_ADMIN") {
    return { ok: false as const, status: 400, error: "Role not assignable" };
  }
  const user = await repo.findUserInEnterprise(id, enterpriseId);
  if (!user) return { ok: false as const, status: 404, error: "User not found" };
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot change role for super admin" };
  }
  const updated = await repo.updateUser(id, { role });
  return { ok: true as const, value: { ...updated, isStaff: updated.role !== "STUDENT" } };
}

export async function updateOwnEnterpriseUser(
  enterpriseId: string,
  id: number,
  data: { active?: boolean; role?: UserRole },
) {
  const user = await repo.findUserInEnterprise(id, enterpriseId);
  if (!user) return { ok: false as const, status: 404, error: "User not found" };
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  const updateData: { active?: boolean; role?: UserRole } = {};
  if (typeof data.active === "boolean") updateData.active = data.active;
  if (data.role && data.role !== "ENTERPRISE_ADMIN") updateData.role = data.role;
  const updated = await repo.updateUser(id, updateData);
  if (updateData.active === false) {
    await repo.revokeActiveRefreshTokens(id);
  }
  return { ok: true as const, value: { ...updated, isStaff: updated.role !== "STUDENT" } };
}

export async function listFeatureFlags(enterpriseId: string) {
  const flags = await repo.listFeatureFlagsByEnterprise(enterpriseId);
  return flags.map(normalizeFeatureFlagLabel);
}

export async function updateFeatureFlag(enterpriseId: string, key: string, enabled: boolean) {
  try {
    const updated = await repo.updateFeatureFlag(enterpriseId, key, enabled);
    return { ok: true as const, value: normalizeFeatureFlagLabel(updated) };
  } catch (err: any) {
    if (err.code === "P2025") return { ok: false as const, status: 404, error: "Feature flag not found" };
    throw err;
  }
}

export async function listEnterprises() {
  const enterprises = await repo.listEnterprises();
  return enterprises.map(toAdminEnterprisePayload);
}

export async function searchEnterprises(filters: AdminEnterpriseSearchFilters) {
  const where = buildAdminEnterpriseSearchWhere(filters);
  const [total, records] = await Promise.all([
    repo.countEnterprisesByWhere(where),
    repo.listEnterprisesByWhere(where, filters.page, filters.pageSize),
  ]);
  return toAdminEnterpriseSearchResponse(records.map(toAdminEnterprisePayload), filters, total);
}

export async function createEnterprise(input: { name: string; code?: string | null }) {
  const nameRaw = input.name.trim();
  if (!nameRaw) return { ok: false as const, status: 400, error: "Enterprise name is required" };
  if (nameRaw.length > 120) return { ok: false as const, status: 400, error: "Enterprise name is too long" };
  let code = input.code?.trim().toUpperCase() ?? "";
  if (code) {
    if (!ENTERPRISE_CODE_REGEX.test(code)) {
      return { ok: false as const, status: 400, error: "Code must be 3-16 uppercase letters or numbers" };
    }
  } else {
    code = await enterpriseCodeGenerator.generateFromName(nameRaw);
  }
  const exists = await repo.findEnterpriseByCode(code);
  if (exists) return { ok: false as const, status: 409, error: "Enterprise code already exists" };
  try {
    const created = await repo.createEnterpriseWithFlags(nameRaw, code, defaultEnterpriseFeatureFlags);
    return {
      ok: true as const,
      value: {
        ...created,
        users: 0,
        admins: 0,
        enterpriseAdmins: 0,
        staff: 0,
        students: 0,
        modules: 0,
        teams: 0,
      },
    };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false as const, status: 409, error: "Enterprise code already exists" };
    throw err;
  }
}

export async function listEnterpriseUsers(enterpriseId: string) {
  const exists = await repo.findEnterpriseById(enterpriseId);
  if (!exists) return { ok: false as const, status: 404, error: "Enterprise not found" };
  const users = await repo.listUsersByEnterprise(enterpriseId);
  return { ok: true as const, value: users.map(toAdminUserPayload) };
}

export async function searchEnterpriseUsers(enterpriseId: string, filters: AdminUserSearchFilters) {
  const exists = await repo.findEnterpriseById(enterpriseId);
  if (!exists) return { ok: false as const, status: 404, error: "Enterprise not found" };
  return { ok: true as const, value: await searchUsers(enterpriseId, filters) };
}

export async function updateEnterpriseUser(
  enterpriseId: string,
  id: number,
  data: { active?: boolean; role?: UserRole },
) {
  const user = await repo.findUserInEnterprise(id, enterpriseId);
  if (!user) return { ok: false as const, status: 404, error: "User not found" };
  if (isSuperAdminEmail(user.email)) {
    return { ok: false as const, status: 400, error: "Cannot modify super admin" };
  }
  const updateData: { active?: boolean; role?: UserRole } = {};
  if (typeof data.active === "boolean") updateData.active = data.active;
  if (data.role && data.role !== "ENTERPRISE_ADMIN") updateData.role = data.role;
  const updated = await repo.updateUser(id, updateData);
  if (updateData.active === false) {
    await repo.revokeActiveRefreshTokens(id);
  }
  return { ok: true as const, value: toAdminUserPayload(updated) };
}

export async function deleteEnterprise(targetEnterpriseId: string, actingEnterpriseId: string | undefined) {
  if (actingEnterpriseId === targetEnterpriseId) {
    return { ok: false as const, status: 400, error: "Cannot delete your own enterprise" };
  }
  const enterprise = await repo.findEnterpriseForDeletion(targetEnterpriseId);
  if (!enterprise) return { ok: false as const, status: 404, error: "Enterprise not found" };
  if (enterprise._count.users > 0 || enterprise._count.modules > 0 || enterprise._count.teams > 0) {
    return {
      ok: false as const,
      status: 400,
      error: `Cannot delete enterprise while it has users (${enterprise._count.users}), modules (${enterprise._count.modules}), or teams (${enterprise._count.teams}).`,
    };
  }
  await repo.deleteEnterpriseWithDependencies(targetEnterpriseId, enterprise._count.auditLogs);
  return { ok: true as const, value: { success: true } };
}

export async function getAuditLogs(enterpriseId: string, filters: { from?: Date; to?: Date; limit?: number }) {
  const logs = await listAuditLogs({ enterpriseId, ...filters });
  return logs.map((entry) => ({
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    ip: entry.ip,
    userAgent: entry.userAgent,
    user: {
      id: entry.user.id,
      email: entry.user.email,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      role: entry.user.role,
    },
  }));
}

function normalizeFeatureFlagLabel<T extends { key: string; label: string }>(flag: T): T {
  if (flag.key === "repos" && flag.label === "Repos") {
    return { ...flag, label: "Repositories" };
  }
  return flag;
}

function toAdminUserPayload(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}) {
  return {
    ...user,
    isStaff: user.role !== "STUDENT",
    role: user.role as UserRole,
  };
}

function toAdminUserSearchResponse(
  records: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    active: boolean;
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

function toAdminEnterprisePayload(enterprise: {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  users: Array<{ role: UserRole }>;
  _count: { users: number; modules: number; teams: number };
}) {
  const roleCount = enterprise.users.reduce(
    (acc, user) => {
      if (user.role === "ADMIN") acc.admins += 1;
      else if (user.role === "ENTERPRISE_ADMIN") acc.enterpriseAdmins += 1;
      else if (user.role === "STAFF") acc.staff += 1;
      else acc.students += 1;
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

function toAdminEnterpriseSearchResponse(
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
