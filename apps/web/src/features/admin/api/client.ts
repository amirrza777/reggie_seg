import { apiFetch } from "@/shared/api/http";
import { API_BASE_URL } from "@/shared/api/env";
import type {
  AdminUser,
  AdminEnterpriseSearchParams,
  AdminEnterpriseSearchResponse,
  AdminUserRecord,
  AdminUserSearchParams,
  AdminUserSearchResponse,
  AdminUserUpdate,
  AuditLogEntry,
  CreateEnterprisePayload,
  EnterpriseRecord,
  AdminSummary,
  UserRole,
} from "../types";

export async function listUsers(): Promise<AdminUserRecord[]> {
  return apiFetch<AdminUserRecord[]>("/admin/users");
}

export async function searchUsers(params: AdminUserSearchParams = {}): Promise<AdminUserSearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.role) search.set("role", params.role);
  if (typeof params.active === "boolean") search.set("active", String(params.active));
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const path = qs ? `/admin/users/search?${qs}` : "/admin/users/search";
  return apiFetch<AdminUserSearchResponse>(path);
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

export async function listAuditLogs(params: { from?: string; to?: string; limit?: number; cursor?: number } = {}) {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.cursor) search.set("cursor", String(params.cursor));
  const qs = search.toString();
  const path = qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs";
  return apiFetch<AuditLogEntry[]>(path);
}

export function getAuditStreamUrl() {
  return `${API_BASE_URL}/admin/audit-logs/stream`;
}

export async function getAdminSummary() {
  return apiFetch<AdminSummary>("/admin/summary");
}

export async function listEnterprises() {
  return apiFetch<EnterpriseRecord[]>("/admin/enterprises");
}

export async function searchEnterprises(
  params: AdminEnterpriseSearchParams = {},
): Promise<AdminEnterpriseSearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const path = qs ? `/admin/enterprises/search?${qs}` : "/admin/enterprises/search";
  return apiFetch<AdminEnterpriseSearchResponse>(path);
}

export async function createEnterprise(payload: CreateEnterprisePayload) {
  return apiFetch<EnterpriseRecord>("/admin/enterprises", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteEnterprise(enterpriseId: string) {
  return apiFetch<{ success: boolean }>(`/admin/enterprises/${encodeURIComponent(enterpriseId)}`, {
    method: "DELETE",
  });
}

export async function listEnterpriseUsers(enterpriseId: string) {
  return apiFetch<AdminUserRecord[]>(`/admin/enterprises/${encodeURIComponent(enterpriseId)}/users`);
}

export async function searchEnterpriseUsers(
  enterpriseId: string,
  params: AdminUserSearchParams = {},
): Promise<AdminUserSearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.role) search.set("role", params.role);
  if (typeof params.active === "boolean") search.set("active", String(params.active));
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const basePath = `/admin/enterprises/${encodeURIComponent(enterpriseId)}/users/search`;
  const path = qs ? `${basePath}?${qs}` : basePath;
  return apiFetch<AdminUserSearchResponse>(path);
}

export async function updateEnterpriseUser(enterpriseId: string, userId: number, payload: AdminUserUpdate) {
  return apiFetch<AdminUser>(`/admin/enterprises/${encodeURIComponent(enterpriseId)}/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
