import { apiFetch } from "@/shared/api/http";
import type {
  AdminUser,
  AdminUserRecord,
  AdminUserUpdate,
  AuditLogEntry,
  FeatureFlag,
  UserRole,
} from "../types";

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>("/admin/feature-flags");
}

export async function listUsers(): Promise<AdminUserRecord[]> {
  return apiFetch<AdminUserRecord[]>("/admin/users");
}

export async function updateUserRole(userId: number, role: UserRole) {
  return apiFetch<AdminUser>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function updateUser(userId: number, payload: AdminUserUpdate) {
  return apiFetch<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAuditLogs(params: { from?: string; to?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const path = qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs";
  return apiFetch<AuditLogEntry[]>(path);
}
