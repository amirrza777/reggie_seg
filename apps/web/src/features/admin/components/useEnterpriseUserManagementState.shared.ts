import type { FormEvent } from "react";
import type { AdminUser, AdminUserRecord, EnterpriseRecord, UserRole } from "../types";

export type RequestState = "idle" | "loading" | "success" | "error";

export const ENTERPRISE_USERS_PER_PAGE = 10;

export const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

export function resolveUnknownError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export type EnterpriseUserLoaders = {
  loadEnterpriseUsers: (enterpriseId: string, query: string, page: number) => Promise<void>;
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
  clearSelectedEnterpriseIfDeleted: (enterpriseId: string) => void;
};
