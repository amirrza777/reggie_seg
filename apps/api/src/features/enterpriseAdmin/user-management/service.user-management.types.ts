import type { Prisma, Role } from "@prisma/client";

export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@kcl.ac.uk").toLowerCase();
export const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();
export const REMOVED_USERS_ENTERPRISE_NAME = process.env.REMOVED_USERS_ENTERPRISE_NAME ?? "Unassigned";
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type ManagedUserRole = Extract<Role, "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN">;

export type EnterpriseUserSearchFilters = {
  query: string | null;
  sortBy: EnterpriseUserSortBy | null;
  sortDirection: EnterpriseUserSortDirection | null;
  page: number;
  pageSize: number;
};

export type EnterpriseUserSortBy = "name" | "joinDate";
export type EnterpriseUserSortDirection = "asc" | "desc";

export type EnterpriseUserSearchCandidate = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  enterpriseActive: boolean;
};

export type EnterpriseManagedUserBase = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
};

export type EnterpriseManagedUser = EnterpriseManagedUserBase & {
  membershipStatus: "active" | "inactive" | "left";
};

export type EnterpriseManagedUserSearchRecord = EnterpriseManagedUserBase & {
  enterpriseId: string;
  blockedEnterpriseId: string | null;
};

export type EnterpriseManagedUserUpdate = {
  active?: boolean;
  role?: ManagedUserRole;
};

export type EnterpriseManagedUserCreateInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: ManagedUserRole;
};

export const MANAGED_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  active: true,
} satisfies Prisma.UserSelect;

export const SEARCH_MANAGED_USER_SELECT = {
  ...MANAGED_USER_SELECT,
  enterpriseId: true,
  blockedEnterpriseId: true,
} satisfies Prisma.UserSelect;

export const REINSTATABLE_USER_SELECT = {
  ...MANAGED_USER_SELECT,
  enterpriseId: true,
  blockedEnterpriseId: true,
  enterprise: { select: { code: true } },
} satisfies Prisma.UserSelect;
