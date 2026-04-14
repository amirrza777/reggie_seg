import type { FormEvent } from "react";
import type { AdminUser, AdminUserRecord, EnterpriseRecord, UserRole } from "../../types";

export type RequestState = "idle" | "loading" | "success" | "error";
export type EnterpriseUserSortValue = "default" | "joinDateDesc" | "joinDateAsc" | "nameAsc" | "nameDesc";

export const ENTERPRISE_USERS_PER_PAGE = 10;
export const DEFAULT_ENTERPRISE_USER_SORT_VALUE: EnterpriseUserSortValue = "default";

export const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

export function resolveUnknownError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function resolveEnterpriseUserSortParams(sortValue: EnterpriseUserSortValue) {
  if (sortValue === "joinDateDesc") {
    return { sortBy: "joinDate" as const, sortDirection: "desc" as const };
  }
  if (sortValue === "joinDateAsc") {
    return { sortBy: "joinDate" as const, sortDirection: "asc" as const };
  }
  if (sortValue === "nameAsc") {
    return { sortBy: "name" as const, sortDirection: "asc" as const };
  }
  if (sortValue === "nameDesc") {
    return { sortBy: "name" as const, sortDirection: "desc" as const };
  }
  return {};
}

export type EnterpriseUserLoaders = {
  loadEnterpriseUsers: (enterpriseId: string, query: string, page: number, sortValue: EnterpriseUserSortValue) => Promise<void>;
};

type EnterpriseUserPagingActions = {
  applyEnterpriseUserPageInput: (value: string) => void;
  handleEnterpriseUserPageJump: (event: FormEvent<HTMLFormElement>) => void;
};

export type EnterpriseUserActions = EnterpriseUserPagingActions & {
  resetSelectedEnterprise: () => void;
  openEnterpriseAccounts: (enterprise: EnterpriseRecord) => void;
  handleEnterpriseUserRoleChange: (userId: number, role: UserRole) => Promise<void>;
  handleEnterpriseUserStatusToggle: (userId: number, nextStatus: boolean) => Promise<void>;
  submitEnterpriseAdminInvite: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  clearSelectedEnterpriseIfDeleted: (enterpriseId: string) => void;
};
