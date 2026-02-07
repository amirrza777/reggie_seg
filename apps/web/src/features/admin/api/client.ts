import { apiFetch } from "@/shared/api/http";
import type { AdminUser, AdminUserRecord, AdminUserUpdate, FeatureFlag, UserRole } from "../types";

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
